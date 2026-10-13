const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const { codigoRecuperacionHtml, attachmentLogo } = require('./emailTemplates');
const { FORMATO_TEMPORAL_REGEX } = require('../../config/passwordTemporal');

const TOKEN_EXPIRA_EN = '8h';
const CODIGO_VALIDO_POR_MINUTOS = 15;

async function buscarUsuarioPorCorreo(email) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.paternal_last_name, u.maternal_last_name, u.email, u.password_hash,
            u.status, u.campus_id, c.campus_name, r.role_name
     FROM user u
     JOIN role r ON r.role_id = u.role_id
     LEFT JOIN campus c ON c.campus_id = u.campus_id
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

function firmarToken(usuario, { debeCambiarPassword = false } = {}) {
  return jwt.sign(
    {
      userId: usuario.user_id,
      role: usuario.role_name,
      campusId: usuario.campus_id,
      ...(debeCambiarPassword ? { debeCambiarPassword: true } : {}),
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRA_EN },
  );
}

async function login(email, password) {
  const usuario = await buscarUsuarioPorCorreo(email);

  // Mensaje genérico en ambos casos (no existe / contraseña mal) — no hay
  // que darle pistas a quien intenta adivinar cuentas válidas.
  if (!usuario || usuario.status !== 1) {
    throw new Error('CREDENCIALES_INVALIDAS');
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    throw new Error('CREDENCIALES_INVALIDAS');
  }

  // No guardamos ningún flag en la base para esto — la propia contraseña que
  // acaba de escribir YA nos dice si es una temporal (formato UVL-XXXXXX),
  // porque ese formato está prohibido para cualquier contraseña elegida por
  // el usuario (ver passwordSchema). Si coincide, es porque todavía no la cambió.
  const debeCambiarPassword = FORMATO_TEMPORAL_REGEX.test(password);

  // La marca va FIRMADA dentro del token: requireAuth bloquea todo lo demás
  // hasta que la cambie, y /first-password la acepta como prueba de que acaba
  // de ingresar con la temporal (por eso no le pedimos la contraseña actual).
  const token = firmarToken(usuario, { debeCambiarPassword });

  return {
    token,
    user: {
      id: usuario.user_id,
      nombre: `${usuario.first_name} ${usuario.paternal_last_name}`.trim(),
      first_name: usuario.first_name,
      paternal_last_name: usuario.paternal_last_name,
      maternal_last_name: usuario.maternal_last_name || '',
      nombres: usuario.first_name,
      apellidoPaterno: usuario.paternal_last_name,
      apellidoMaterno: usuario.maternal_last_name || '',
      correo: usuario.email,
      role: usuario.role_name,
      campusId: usuario.campus_id,
      sede: usuario.campus_name || '',
      debeCambiarPassword,
    },
  };
}

function generarCodigo6Digitos() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function solicitarCodigoRecuperacion(email) {
  const usuario = await buscarUsuarioPorCorreo(email);

  // No revelamos si el correo existe o no — misma respuesta en ambos casos
  // (evita que alguien use este endpoint para descubrir cuentas válidas).
  if (!usuario || usuario.status !== 1) {
    return;
  }

  const codigo = generarCodigo6Digitos();
  const enviadoEn = new Date();
  const expiraEn = new Date(enviadoEn.getTime() + CODIGO_VALIDO_POR_MINUTOS * 60 * 1000);

  // Solo vale el último código pedido: los anteriores que no se usaron se invalidan.
  await pool.query('UPDATE verification_code SET status = 0 WHERE user_id = ? AND status = 1', [usuario.user_id]);

  await pool.query(
    'INSERT INTO verification_code (user_id, code, sent_at, expires_at) VALUES (?, ?, ?, ?)',
    [usuario.user_id, codigo, enviadoEn, expiraEn],
  );

  await transporter.sendMail({
    from: `"Bienestar Financiero Univalle" <${process.env.MAIL_USER}>`,
    to: usuario.email,
    subject: 'Código de recuperación de contraseña',
    html: codigoRecuperacionHtml(codigo),
    attachments: attachmentLogo(),
  });
}

const RESET_TOKEN_EXPIRA_EN = '10m';

async function verificarCodigo(email, code) {
  const usuario = await buscarUsuarioPorCorreo(email);
  if (!usuario || usuario.status !== 1) {
    throw new Error('CODIGO_INVALIDO');
  }

  const [rows] = await pool.query(
    `SELECT verification_code_id, expires_at FROM verification_code
     WHERE user_id = ? AND code = ? AND status = 1
     ORDER BY sent_at DESC LIMIT 1`,
    [usuario.user_id, code],
  );
  const registro = rows[0];
  if (!registro) {
    throw new Error('CODIGO_INVALIDO');
  }

  if (new Date() > registro.expires_at) {
    throw new Error('CODIGO_EXPIRADO');
  }

  // Se usa una sola vez — lo invalidamos apenas se verifica correctamente.
  await pool.query('UPDATE verification_code SET status = 0 WHERE verification_code_id = ?', [
    registro.verification_code_id,
  ]);

  // Token de corta duración, solo sirve para el siguiente paso (nueva contraseña).
  const resetToken = jwt.sign(
    { userId: usuario.user_id, purpose: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRA_EN },
  );

  return { resetToken };
}

async function restablecerContrasena(resetToken, newPassword) {
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new Error('TOKEN_INVALIDO');
  }

  if (payload.purpose !== 'password-reset') {
    throw new Error('TOKEN_INVALIDO');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE user SET password_hash = ? WHERE user_id = ?', [passwordHash, payload.userId]);
}

// Cambio de contraseña con sesión activa (primer ingreso con la temporal, o
// "Editar mi perfil" más adelante) — a diferencia de restablecerContrasena,
// acá SÍ hay que probar que la persona conoce su contraseña actual.
async function cambiarPasswordPropia(userId, currentPassword, newPassword) {
  const [rows] = await pool.query('SELECT password_hash FROM user WHERE user_id = ? AND status = 1', [userId]);
  const usuario = rows[0];
  if (!usuario) {
    throw new Error('USUARIO_NO_ENCONTRADO');
  }

  const coincide = await bcrypt.compare(currentPassword, usuario.password_hash);
  if (!coincide) {
    throw new Error('CONTRASENA_ACTUAL_INCORRECTA');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE user SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
}

// Primer ingreso: el token ya prueba que acaba de entrar con la contraseña
// temporal, así que solo se pide la nueva. Devuelve un token nuevo, sin la marca.
async function establecerPasswordInicial({ userId, role, campusId }, newPassword) {
  const [rows] = await pool.query('SELECT user_id FROM user WHERE user_id = ? AND status = 1', [userId]);
  if (!rows.length) {
    throw new Error('USUARIO_NO_ENCONTRADO');
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE user SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
  return firmarToken({ user_id: userId, role_name: role, campus_id: campusId });
}

async function actualizarPerfil(userId, datos) {
  const firstName = (datos.first_name ?? datos.nombres ?? '').trim();
  const paternalLastName = (datos.paternal_last_name ?? datos.apellidoPaterno ?? '').trim();
  const maternalLastNameRaw = datos.maternal_last_name !== undefined ? datos.maternal_last_name : datos.apellidoMaterno;
  const maternalLastName = maternalLastNameRaw ? maternalLastNameRaw.trim() : null;

  const [userRows] = await pool.query('SELECT user_id FROM user WHERE user_id = ? AND status = 1', [userId]);
  if (!userRows.length) {
    throw new Error('USUARIO_NO_ENCONTRADO');
  }

  await pool.query(
    `UPDATE user
     SET first_name = ?, paternal_last_name = ?, maternal_last_name = ?, updated_at = NOW()
     WHERE user_id = ?`,
    [firstName, paternalLastName, maternalLastName, userId],
  );

  const [rows] = await pool.query(
    `SELECT u.user_id, u.first_name, u.paternal_last_name, u.maternal_last_name,
            u.email, u.status, u.campus_id, c.campus_name, r.role_name
     FROM user u
     JOIN role r ON r.role_id = u.role_id
     LEFT JOIN campus c ON c.campus_id = u.campus_id
     WHERE u.user_id = ?
     LIMIT 1`,
    [userId],
  );

  const usuario = rows[0];
  return {
    id: usuario.user_id,
    first_name: usuario.first_name,
    paternal_last_name: usuario.paternal_last_name,
    maternal_last_name: usuario.maternal_last_name || '',
    nombres: usuario.first_name,
    apellidoPaterno: usuario.paternal_last_name,
    apellidoMaterno: usuario.maternal_last_name || '',
    nombre: [usuario.first_name, usuario.paternal_last_name].filter(Boolean).join(' '),
    correo: usuario.email,
    role: usuario.role_name,
    campusId: usuario.campus_id,
    sede: usuario.campus_name || '',
  };
}

module.exports = {
  login,
  buscarUsuarioPorCorreo,
  solicitarCodigoRecuperacion,
  verificarCodigo,
  restablecerContrasena,
  cambiarPasswordPropia,
  establecerPasswordInicial,
  actualizarPerfil,
};

