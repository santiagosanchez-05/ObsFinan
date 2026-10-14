// Avisos por correo del sistema. Cada función se llama SIN await desde el
// controlador o servicio, después de que la acción ya se guardó: el correo se
// manda en segundo plano y, si falla, solo se registra el error (la acción no
// se deshace ni demora la respuesta).
// En los tests (NODE_ENV=test) no hacen nada, salvo que NOTIFICAR_EN_TEST=1:
// así no consumen los mocks de la BD de los demás tests.
const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const { ESTADO, ESTADO_CARGA, MODULO, MODALIDAD_EVENTO } = require('../../config/estados');
const { correoHtml, attachmentLogo } = require('./notificaciones.plantilla');

// Ventana para agrupar los avisos de encuestas pendientes de un mismo encuestador.
const MINUTOS_AGRUPAR_ENCUESTAS = 30;

const NOMBRE_MODALIDAD = {
  [MODALIDAD_EVENTO.PRESENCIAL]: 'Presencial',
  [MODALIDAD_EVENTO.VIRTUAL]: 'Virtual',
  [MODALIDAD_EVENTO.HIBRIDO]: 'Híbrido',
};
const NOMBRE_MODULO = { [MODULO.ICA]: 'ICA', [MODULO.SPE]: 'Sector Privado Exportador' };

const urlApp = (ruta) => `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}${ruta}`;
const desactivado = () => process.env.NODE_ENV === 'test' && process.env.NOTIFICAR_EN_TEST !== '1';

function enSegundoPlano(nombre, tarea) {
  if (desactivado()) return Promise.resolve();
  return Promise.resolve()
    .then(tarea)
    .catch((err) => console.error(`No se pudo enviar el aviso "${nombre}":`, err.message));
}

// Con varios destinatarios van en copia oculta: nadie ve los correos de los demás.
async function enviar({ para, asunto, ...contenido }) {
  const correos = [...new Set((Array.isArray(para) ? para : [para]).filter(Boolean))];
  if (!correos.length) return false;
  const destino = correos.length > 1 ? { to: process.env.MAIL_USER, bcc: correos } : { to: correos[0] };
  await transporter.sendMail({
    from: `"Bienestar Financiero Univalle" <${process.env.MAIL_USER}>`,
    ...destino,
    subject: asunto,
    html: correoHtml(contenido),
    attachments: attachmentLogo(),
  });
  return true;
}

// ---------------------------------------------------------------- destinatarios
async function correosPorRol(rol, campusId = null) {
  const [filas] = await pool.query(
    `SELECT u.email
       FROM user u
       JOIN role r ON r.role_id = u.role_id
      WHERE r.role_name = ? AND u.status = ?${campusId ? ' AND u.campus_id = ?' : ''}`,
    campusId ? [rol, ESTADO.ACTIVO, campusId] : [rol, ESTADO.ACTIVO],
  );
  return filas.map((f) => f.email);
}

// Admin de la sede; si la sede todavía no tiene Admin, los Superadmin.
async function adminsOSuperadmins(campusId) {
  const admins = await correosPorRol('admin', campusId);
  return admins.length ? admins : correosPorRol('superadmin');
}

async function correosEncuestadoresDelEvento(eventId) {
  const [filas] = await pool.query(
    `SELECT u.email
       FROM event_surveyor es
       JOIN user u ON u.user_id = es.surveyor_user_id
      WHERE es.event_id = ? AND es.status = ? AND u.status = ?`,
    [eventId, ESTADO.ACTIVO, ESTADO.ACTIVO],
  );
  return filas.map((f) => f.email);
}

async function leerEvento(eventId) {
  const [[evento]] = await pool.query(
    `SELECT e.event_id, e.title, DATE_FORMAT(e.event_date, '%Y-%m-%d') AS fecha,
            TIME_FORMAT(e.event_time, '%H:%i') AS hora, e.location, e.modality,
            e.has_ica, e.has_spe, e.campus_id, c.campus_name
       FROM event e
       JOIN campus c ON c.campus_id = e.campus_id
      WHERE e.event_id = ?`,
    [eventId],
  );
  return evento || null;
}

function fechaLarga(fecha) {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function encuestasDelEvento(evento) {
  return [evento.has_ica ? 'ICA' : null, evento.has_spe ? 'Sector Privado Exportador' : null].filter(Boolean).join(' y ');
}

function detallesEvento(evento) {
  return [
    ['Evento', evento.title],
    ['Fecha', fechaLarga(evento.fecha)],
    ['Hora', evento.hora],
    ['Lugar', evento.location],
    ['Modalidad', NOMBRE_MODALIDAD[evento.modality]],
    ['Sede', evento.campus_name],
  ];
}

// ---------------------------------------------------------------- postulaciones
// Nueva postulación → Admin de la sede de la convocatoria (o Superadmin).
function nuevaPostulacion({ convocationId, nombre, correo, telefono }) {
  return enSegundoPlano('nueva postulación', async () => {
    const [[conv]] = await pool.query(
      `SELECT c.convocation_id, c.title, c.campus_id, ca.campus_name
         FROM convocation c JOIN campus ca ON ca.campus_id = c.campus_id
        WHERE c.convocation_id = ?`,
      [convocationId],
    );
    if (!conv) return;
    await enviar({
      para: await adminsOSuperadmins(conv.campus_id),
      asunto: `Nueva postulación: ${conv.title}`,
      titulo: 'Nueva postulación recibida',
      parrafos: ['Una persona se postuló como encuestador. Puedes revisarla y aceptarla o rechazarla desde la lista de postulantes.'],
      detalles: [['Convocatoria', conv.title], ['Sede', conv.campus_name], ['Postulante', nombre], ['Correo', correo], ['Teléfono', telefono]],
      boton: { texto: 'Ver postulantes', url: urlApp(`/convocatorias/${conv.convocation_id}/postulantes`) },
    });
  });
}

// Rechazo → al postulante. (La aceptación la avisa el correo de bienvenida
// con la contraseña temporal, ver users.service registrarUsuario.)
function postulacionRechazada({ correo, nombre, convocatoria }) {
  return enSegundoPlano('postulación rechazada', () => enviar({
    para: correo,
    asunto: 'Resultado de tu postulación',
    titulo: 'Resultado de tu postulación',
    parrafos: [
      `Hola ${nombre}, gracias por postularte a la convocatoria "${convocatoria}".`,
      'Luego de revisar las postulaciones, en esta oportunidad no fuiste seleccionado/a. Te invitamos a postularte en próximas convocatorias.',
    ],
  }));
}

// ---------------------------------------------------------------- encuestas
// Encuesta pendiente (la manda un encuestador). ICA → Admin de su sede y
// Superadmin; SPE → solo Superadmin. Se agrupa: si el mismo encuestador ya
// tenía otra pendiente del mismo módulo en los últimos 30 minutos, no se
// vuelve a avisar (en un evento puede mandar decenas seguidas).
function encuestaPendiente({ modulo, dataLoadId, encuestadorId, eventId }) {
  return enSegundoPlano('encuesta pendiente', async () => {
    const [[reciente]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM data_load
        WHERE module = ? AND created_modified_by = ? AND status = ? AND data_load_id <> ?
          AND created_at >= NOW() - INTERVAL ${MINUTOS_AGRUPAR_ENCUESTAS} MINUTE`,
      [modulo, encuestadorId, ESTADO_CARGA.PENDIENTE, dataLoadId],
    );
    if (Number(reciente.total) > 0) return;

    const [[encuestador]] = await pool.query(
      `SELECT CONCAT(u.first_name, ' ', u.paternal_last_name) AS nombre, u.campus_id, c.campus_name
         FROM user u LEFT JOIN campus c ON c.campus_id = u.campus_id
        WHERE u.user_id = ?`,
      [encuestadorId],
    );
    const [[pendientes]] = await pool.query(
      'SELECT COUNT(*) AS total FROM data_load WHERE module = ? AND created_modified_by = ? AND status = ?',
      [modulo, encuestadorId, ESTADO_CARGA.PENDIENTE],
    );
    const evento = eventId ? await leerEvento(eventId) : null;

    const para = modulo === MODULO.ICA
      ? [...(await correosPorRol('admin', encuestador?.campus_id)), ...(await correosPorRol('superadmin'))]
      : await correosPorRol('superadmin');

    await enviar({
      para,
      asunto: `Encuestas ${NOMBRE_MODULO[modulo]} pendientes de aprobación`,
      titulo: 'Hay encuestas pendientes de aprobación',
      parrafos: [
        `${encuestador?.nombre || 'Un encuestador'} envió encuestas ${NOMBRE_MODULO[modulo]} que esperan tu revisión. Solo se cuentan en los dashboards cuando se aprueban.`,
      ],
      detalles: [
        ['Encuestador', encuestador?.nombre],
        ['Sede', encuestador?.campus_name],
        ['Evento', evento?.title],
        ['Pendientes de este encuestador', String(pendientes.total)],
      ],
      boton: { texto: 'Ir a aprobaciones', url: urlApp('/aprobaciones') },
      nota: `Para no llenar tu bandeja, las encuestas que el mismo encuestador envíe en los siguientes ${MINUTOS_AGRUPAR_ENCUESTAS} minutos no generan otro aviso.`,
    });
  });
}

// Aprobada o rechazada → al encuestador que la envió.
function encuestaRevisada({ dataLoadId, aprobada, motivo }) {
  return enSegundoPlano('encuesta revisada', async () => {
    const [[carga]] = await pool.query(
      `SELECT dl.module, DATE_FORMAT(dl.created_at, '%d/%m/%Y') AS enviada, u.email, u.first_name,
              COALESCE(
                (SELECT e.title FROM ica_survey_response s JOIN event e ON e.event_id = s.event_id WHERE s.data_load_id = dl.data_load_id LIMIT 1),
                (SELECT e.title FROM spe_survey_response s JOIN event e ON e.event_id = s.event_id WHERE s.data_load_id = dl.data_load_id LIMIT 1)
              ) AS evento
         FROM data_load dl
         JOIN user u ON u.user_id = dl.created_modified_by
         JOIN role r ON r.role_id = u.role_id
        WHERE dl.data_load_id = ? AND r.role_name = 'encuestador'`,
      [dataLoadId],
    );
    if (!carga) return; // la cargó un Admin/Superadmin: no hay a quién avisar
    const modulo = NOMBRE_MODULO[carga.module];
    await enviar({
      para: carga.email,
      asunto: aprobada ? `Tu encuesta ${modulo} fue aprobada` : `Tu encuesta ${modulo} fue rechazada`,
      titulo: aprobada ? 'Encuesta aprobada' : 'Encuesta rechazada',
      parrafos: [aprobada
        ? `Hola ${carga.first_name}, tu encuesta ${modulo} fue aprobada y ya se cuenta en el dashboard.`
        : `Hola ${carga.first_name}, tu encuesta ${modulo} fue rechazada y no se contará en el dashboard.`],
      detalles: [['Evento', carga.evento], ['Enviada el', carga.enviada], ['Motivo', aprobada ? null : motivo || 'Sin motivo indicado']],
      boton: { texto: 'Ver mis encuestas', url: urlApp('/encuestador/encuestas') },
    });
  });
}

// ---------------------------------------------------------------- eventos
// Nuevo evento con encuesta → encuestadores activos de su sede.
function nuevoEvento(eventId) {
  return enSegundoPlano('nuevo evento', async () => {
    const evento = await leerEvento(eventId);
    if (!evento || (!evento.has_ica && !evento.has_spe)) return;
    await enviar({
      para: await correosPorRol('encuestador', evento.campus_id),
      asunto: `Nuevo evento con encuesta: ${evento.title}`,
      titulo: 'Nuevo evento con encuesta',
      parrafos: [`Se publicó un evento en tu sede donde se tomarán encuestas ${encuestasDelEvento(evento)}. Si quieres participar como encuestador, puedes anotarte desde el detalle del evento.`],
      detalles: detallesEvento(evento),
      boton: { texto: 'Ver el evento', url: urlApp(`/eventos/${evento.event_id}`) },
    });
  });
}

// Asignación por el Admin/Superadmin → al encuestador asignado.
function asignadoAEvento({ eventId, userId }) {
  return enSegundoPlano('asignación a evento', async () => {
    const evento = await leerEvento(eventId);
    const [[usuario]] = await pool.query('SELECT email, first_name FROM user WHERE user_id = ?', [userId]);
    if (!evento || !usuario) return;
    await enviar({
      para: usuario.email,
      asunto: `Te asignaron al evento: ${evento.title}`,
      titulo: 'Te asignaron a un evento',
      parrafos: [`Hola ${usuario.first_name}, te asignaron como encuestador en este evento. Desde Mis eventos podrás registrar las encuestas ${encuestasDelEvento(evento)}.`],
      detalles: detallesEvento(evento),
      boton: { texto: 'Ir a Mis eventos', url: urlApp('/encuestador/eventos') },
    });
  });
}

// Cambió fecha, hora, lugar o modalidad → a los encuestadores del evento.
// `antes` es el evento como lo devuelve events.service (fecha, hora, lugar, modalidad).
function eventoCambiado(eventId, antes) {
  return enSegundoPlano('evento cambiado', async () => {
    const evento = await leerEvento(eventId);
    if (!evento || !antes) return;
    const cambios = [
      ['Fecha', antes.fecha, evento.fecha, fechaLarga],
      ['Hora', antes.hora, evento.hora],
      ['Lugar', antes.lugar, evento.location],
      ['Modalidad', antes.modalidad, evento.modality, (m) => NOMBRE_MODALIDAD[m]],
    ].filter(([, a, d]) => String(a ?? '') !== String(d ?? ''));
    if (!cambios.length) return;
    await enviar({
      para: await correosEncuestadoresDelEvento(eventId),
      asunto: `Cambios en el evento: ${evento.title}`,
      titulo: 'El evento cambió',
      parrafos: [`Hubo cambios en un evento en el que participas como encuestador: ${cambios.map(([campo]) => campo.toLowerCase()).join(', ')}.`],
      detalles: [
        ...cambios.map(([campo, a, , formato = (v) => v]) => [`${campo} anterior`, formato(a)]),
        ...detallesEvento(evento),
      ],
      boton: { texto: 'Ver el evento', url: urlApp(`/eventos/${evento.event_id}`) },
    });
  });
}

// Baja del evento: hay que leer a quién avisar ANTES de darlo de baja (la baja
// también da de baja las asignaciones). Devuelve la función que manda el aviso.
async function prepararAvisoCancelacion(eventId) {
  if (desactivado()) return () => Promise.resolve();
  try {
    const evento = await leerEvento(eventId);
    const para = await correosEncuestadoresDelEvento(eventId);
    return () => enSegundoPlano('evento cancelado', () => evento && enviar({
      para,
      asunto: `Evento cancelado: ${evento.title}`,
      titulo: 'Evento cancelado',
      parrafos: ['Se canceló un evento en el que participabas como encuestador. Ya no aparece en Mis eventos.'],
      detalles: detallesEvento(evento),
    }));
  } catch (err) {
    console.error('No se pudo preparar el aviso de evento cancelado:', err.message);
    return () => Promise.resolve();
  }
}

// ---------------------------------------------------------------- cuenta
// Aviso de seguridad al cambiar la contraseña (perfil o recuperación).
function contrasenaCambiada(userId) {
  return enSegundoPlano('contraseña cambiada', async () => {
    const [[usuario]] = await pool.query('SELECT email, first_name FROM user WHERE user_id = ?', [userId]);
    if (!usuario) return;
    await enviar({
      para: usuario.email,
      asunto: 'Tu contraseña fue cambiada',
      titulo: 'Tu contraseña fue cambiada',
      parrafos: [
        `Hola ${usuario.first_name}, te avisamos que la contraseña de tu cuenta se cambió recién.`,
        'Si fuiste tú, no tienes que hacer nada. Si no reconoces este cambio, recupera tu contraseña desde "¿Olvidaste tu contraseña?" y avisa al administrador.',
      ],
      boton: { texto: 'Ir a iniciar sesión', url: urlApp('/login') },
    });
  });
}

module.exports = {
  nuevaPostulacion,
  postulacionRechazada,
  encuestaPendiente,
  encuestaRevisada,
  nuevoEvento,
  asignadoAEvento,
  eventoCambiado,
  prepararAvisoCancelacion,
  contrasenaCambiada,
  MINUTOS_AGRUPAR_ENCUESTAS,
};
