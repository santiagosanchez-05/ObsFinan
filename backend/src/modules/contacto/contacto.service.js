const pool = require('../../config/db');
const transporter = require('../../config/mailer');

async function obtenerSedesActivas() {
  const [rows] = await pool.query('SELECT campus_id, campus_name FROM campus WHERE status = 1 ORDER BY campus_name');
  return rows.map((c) => ({ id: c.campus_id, nombre: c.campus_name }));
}

// El mensaje le llega al Admin activo de la sede elegida. Si esa sede todavía
// no tiene Admin, le llega a todos los Superadmin activos (nunca a un
// Superadmin "de rebote" cuando la sede sí tiene Admin).
async function obtenerDestinatarios(sedeId) {
  const [admins] = await pool.query(
    `SELECT u.email
       FROM user u
       JOIN role r ON r.role_id = u.role_id
      WHERE u.campus_id = ? AND r.role_name = 'admin' AND u.status = 1`,
    [sedeId],
  );
  if (admins.length) {
    return { correos: admins.map((a) => a.email), sinAdmin: false };
  }

  const [superadmins] = await pool.query(
    `SELECT u.email
       FROM user u
       JOIN role r ON r.role_id = u.role_id
      WHERE r.role_name = 'superadmin' AND u.status = 1`,
  );
  return { correos: superadmins.map((s) => s.email), sinAdmin: true };
}

// El contenido lo escribe cualquier visitante: se escapa antes de meterlo en
// el HTML del correo para que no pueda inyectar enlaces/markup.
function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function enviarMensajeContacto({ nombre, correo, institucion, sedeId, asunto, mensaje }) {
  const [sedes] = await pool.query('SELECT campus_name FROM campus WHERE campus_id = ? AND status = 1', [sedeId]);
  if (!sedes.length) throw new Error('SEDE_NO_ENCONTRADA');
  const sede = sedes[0].campus_name;

  const { correos, sinAdmin } = await obtenerDestinatarios(sedeId);
  // Caso extremo (no hay ni Admin ni Superadmin activos): al buzón del sistema.
  const destinatarios = correos.length ? correos : [process.env.MAIL_USER];

  await transporter.sendMail({
    from: `"Contacto Observatorio" <${process.env.MAIL_USER}>`,
    replyTo: correo,
    to: destinatarios.join(', '),
    subject: `[Contacto · Sede ${sede}] ${asunto}`,
    html: `
      <h3>Nuevo mensaje de contacto</h3>
      <p><strong>De:</strong> ${escaparHtml(nombre)} (${escaparHtml(correo)})</p>
      ${institucion ? `<p><strong>Institución:</strong> ${escaparHtml(institucion)}</p>` : ''}
      <p><strong>Sede:</strong> ${escaparHtml(sede)}${sinAdmin ? ' (sin administrador asignado — enviado a los superadmin)' : ''}</p>
      <p><strong>Asunto:</strong> ${escaparHtml(asunto)}</p>
      <p><strong>Mensaje:</strong></p>
      <p style="white-space: pre-line">${escaparHtml(mensaje)}</p>
    `,
  });

  return { sede, sinAdmin };
}

// Correo público del footer: el Superadmin activo más antiguo. Si se da de
// baja, pasa solo al siguiente. Si no hay ninguno, el frontend usa el genérico.
async function obtenerCorreoContacto() {
  const [rows] = await pool.query(
    `SELECT u.email
       FROM user u
       JOIN role r ON r.role_id = u.role_id
      WHERE r.role_name = 'superadmin' AND u.status = 1
      ORDER BY u.created_at ASC, u.user_id ASC
      LIMIT 1`,
  );
  return rows[0]?.email ?? null;
}

module.exports = { obtenerSedesActivas, obtenerDestinatarios, enviarMensajeContacto, escaparHtml, obtenerCorreoContacto };
