const bcrypt = require('bcrypt');
const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const { generarPasswordTemporal } = require('../../config/passwordTemporal');
const { bienvenidaHtml, attachmentLogo } = require('./emailTemplates');

const IMAGE_TYPE_USER = 'user'; // convención acordada para image.type — ver users/README.md

async function obtenerDashboardUsuarios() {
  const [usuariosRows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.paternal_last_name, u.maternal_last_name,
            u.email, u.status, c.campus_name, r.role_name
     FROM user u
     JOIN campus c ON c.campus_id = u.campus_id
     JOIN role r ON r.role_id = u.role_id
     ORDER BY u.created_at DESC`,
  );

  const [[{ sedesActivas }]] = await pool.query('SELECT COUNT(*) AS sedesActivas FROM campus WHERE status = 1');

  const idsConFoto = await obtenerIdsConFoto();

  const usuarios = usuariosRows.map((u) => ({
    id: u.user_id,
    nombre: u.first_name,
    apellidos: [u.paternal_last_name, u.maternal_last_name].filter(Boolean).join(' '),
    correo: u.email,
    sede: u.campus_name,
    rol: u.role_name,
    activo: u.status === 1,
    tieneFoto: idsConFoto.has(u.user_id),
  }));

  const totalUsuarios = usuarios.length;
  const adminsActivos = usuarios.filter((u) => u.rol === 'admin' && u.activo).length;
  const cuentasInactivas = usuarios.filter((u) => !u.activo).length;

  const porSede = agruparYContar(usuarios, (u) => u.sede, 'sede');
  const porRol = agruparYContar(usuarios, (u) => u.rol, 'rol');

  return {
    stats: { totalUsuarios, sedesActivas, adminsActivos, cuentasInactivas },
    porSede,
    porRol,
    usuarios,
  };
}

// Agrupa una lista por la clave que devuelva `obtenerClave` y cuenta cuántos hay
// en cada grupo — lo usan tanto "usuarios por sede" como "usuarios por rol".
function agruparYContar(lista, obtenerClave, nombreCampo) {
  const mapa = new Map();
  for (const item of lista) {
    const clave = obtenerClave(item);
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  }
  return [...mapa.entries()].map(([clave, total]) => ({ [nombreCampo]: clave, total }));
}

async function obtenerUsuarioPorId(userId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.paternal_last_name, u.maternal_last_name,
            u.email, u.status, u.created_at, u.updated_at, c.campus_name, r.role_name
     FROM user u
     JOIN campus c ON c.campus_id = u.campus_id
     JOIN role r ON r.role_id = u.role_id
     WHERE u.user_id = ?
     LIMIT 1`,
    [userId],
  );
  const u = rows[0];
  if (!u) return null;

  const [[{ tieneFoto }]] = await pool.query(
    'SELECT COUNT(*) AS tieneFoto FROM image WHERE type = ? AND entity_id = ?',
    [IMAGE_TYPE_USER, userId],
  );

  return {
    id: u.user_id,
    nombre: u.first_name,
    apellidoPaterno: u.paternal_last_name,
    apellidoMaterno: u.maternal_last_name,
    apellidos: [u.paternal_last_name, u.maternal_last_name].filter(Boolean).join(' '),
    correo: u.email,
    sede: u.campus_name,
    rol: u.role_name,
    activo: u.status === 1,
    fechaRegistro: u.created_at,
    fechaActualizacion: u.updated_at,
    tieneFoto: tieneFoto > 0,
  };
}

// Todos los user_id que tienen al menos una foto — usado por el listado
// para saber a quién pedirle la miniatura sin hacer una consulta por fila.
async function obtenerIdsConFoto() {
  const [rows] = await pool.query('SELECT DISTINCT entity_id FROM image WHERE type = ?', [IMAGE_TYPE_USER]);
  return new Set(rows.map((r) => r.entity_id));
}

// La tabla `image` no guarda el mimetype — lo inferimos de los primeros
// bytes (magic numbers). Solo aceptamos JPG/PNG al subir, así que alcanza
// con distinguir esos dos.
function detectarMimeType(buffer) {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

async function obtenerFotoUsuario(userId) {
  const [rows] = await pool.query(
    'SELECT image_blob FROM image WHERE type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1',
    [IMAGE_TYPE_USER, userId],
  );
  const blob = rows[0]?.image_blob;
  if (!blob) return null;
  return { buffer: blob, mimeType: detectarMimeType(blob) };
}

async function obtenerCampusActivos() {
  const [rows] = await pool.query('SELECT campus_id, campus_name FROM campus WHERE status = 1 ORDER BY campus_name');
  return rows.map((c) => ({ id: c.campus_id, nombre: c.campus_name }));
}

async function registrarUsuario({ nombre, apellidoPaterno, apellidoMaterno, correo, rol, campusId, creadoPor, foto }) {
  const [[rolRow]] = await pool.query('SELECT role_id FROM role WHERE role_name = ? AND status = 1', [rol]);
  if (!rolRow) {
    throw new Error('ROL_INVALIDO');
  }

  // Regla de negocio: una sede solo puede tener UN admin activo a la vez.
  if (rol === 'admin') {
    const [[{ adminsActivosEnSede }]] = await pool.query(
      'SELECT COUNT(*) AS adminsActivosEnSede FROM user WHERE campus_id = ? AND role_id = ? AND status = 1',
      [campusId, rolRow.role_id],
    );
    if (adminsActivosEnSede > 0) {
      throw new Error('SEDE_YA_TIENE_ADMIN');
    }
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  const conexion = await pool.getConnection();
  let userId;

  try {
    await conexion.beginTransaction();

    const [resultUsuario] = await conexion.query(
      `INSERT INTO user (role_id, campus_id, first_name, paternal_last_name, maternal_last_name, email, password_hash, status, created_modified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [rolRow.role_id, campusId, nombre, apellidoPaterno, apellidoMaterno || null, correo, passwordHash, creadoPor],
    );
    userId = resultUsuario.insertId;

    if (foto) {
      await conexion.query('INSERT INTO image (image_blob, type, entity_id, created_at) VALUES (?, ?, ?, NOW())', [
        foto,
        IMAGE_TYPE_USER,
        userId,
      ]);
    }

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('CORREO_YA_REGISTRADO');
    }
    throw err;
  } finally {
    conexion.release();
  }

  // El correo se manda DESPUÉS del commit — si falla el envío, la cuenta ya
  // quedó creada igual (por eso el controller también devuelve la contraseña
  // temporal, como respaldo si el correo no llega).
  let correoEnviado = true;
  try {
    await transporter.sendMail({
      from: `"Bienestar Financiero Univalle" <${process.env.MAIL_USER}>`,
      to: correo,
      subject: 'Tu cuenta en Bienestar Financiero Univalle',
      html: bienvenidaHtml(nombre, passwordTemporal),
      attachments: attachmentLogo(),
    });
  } catch (err) {
    console.error('No se pudo enviar el correo de bienvenida:', err);
    correoEnviado = false;
  }

  return { userId, passwordTemporal, correoEnviado };
}

module.exports = {
  obtenerDashboardUsuarios,
  obtenerUsuarioPorId,
  obtenerCampusActivos,
  registrarUsuario,
  obtenerFotoUsuario,
  detectarMimeType,
};
