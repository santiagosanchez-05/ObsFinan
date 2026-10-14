// Santiago — US43 (listado), US44 (registro), US45 (editar), US46 (eliminar),
// US47 (detalle) y US55 (asignar encuestadores).
// Tablas: event, event_surveyor, image (type = TIPO_IMAGEN.EVENTO).
// El evento indica qué encuestas se toman con has_ica / has_spe (0/1, pueden ser las dos
// o ninguna). Un Admin solo puede marcar has_ica; has_spe es solo del Superadmin.
// Solo se asignan encuestadores a eventos con al menos una de las dos en 1.
// Además, el encuestador puede anotarse solo (sin límite) en los eventos con
// encuesta de su sede: POST/DELETE /api/events/:id/participacion.
const eventsService = require('./events.service');
const notificaciones = require('../notificaciones/notificaciones.service');
const { eventoSchema, listarEventosQuerySchema, asignarEncuestadorSchema } = require('./events.validation');

const ERROR_INTERNO = { error: 'Error interno del servidor' };

function idDeRuta(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Reglas que dependen del rol (no las puede validar Zod solo).
// `actual` es el evento antes de editar (null al crear).
async function validarReglasEvento(datos, user, actual) {
  const esSuperadmin = user.role === 'superadmin';

  let campusId;
  if (esSuperadmin) {
    campusId = datos.campusId ?? actual?.campusId;
    if (!campusId) return { status: 400, error: 'Selecciona la sede del evento' };
    if (!(await eventsService.existeSedeActiva(campusId))) return { status: 400, error: 'La sede no existe o está inactiva' };
  } else {
    campusId = user.campusId;
    if (datos.campusId && Number(datos.campusId) !== Number(user.campusId)) {
      return { status: 403, error: 'Solo puedes registrar eventos de tu sede' };
    }
  }

  if (!esSuperadmin && datos.hasSpe !== (actual?.hasSpe ?? false)) {
    return { status: 403, error: 'Solo el Superadmin puede habilitar o quitar la encuesta SPE' };
  }

  // Al crear, la fecha tiene que ser hoy o futura. Al editar, se puede dejar
  // la fecha que ya tenía aunque haya pasado, pero no moverla al pasado.
  const fechaCambio = !actual || datos.fecha !== actual.fecha;
  if (fechaCambio && datos.fecha < eventsService.hoyEnBolivia()) {
    return { status: 400, error: 'La fecha del evento no puede ser anterior a hoy' };
  }

  return { campusId };
}

async function getEventos(req, res) {
  const parsed = listarEventosQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Filtros inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const encuestador =
      req.user?.role === 'encuestador' ? { userId: req.user.userId, campusId: req.user.campusId } : null;
    return res.json(await eventsService.listarEventos({ ...parsed.data, encuestador }));
  } catch (err) {
    console.error('Error al listar eventos:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function getEvento(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) return res.status(400).json({ error: 'ID inválido' });
  try {
    const evento = await eventsService.obtenerEvento(eventId);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    // El encuestador necesita saber si ya está anotado para mostrar el botón correcto.
    if (req.user?.role === 'encuestador') {
      evento.participando = await eventsService.estaParticipando(eventId, req.user.userId);
    }
    return res.json(evento);
  } catch (err) {
    console.error('Error al obtener el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function getImagenEvento(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) return res.status(400).json({ error: 'ID inválido' });
  try {
    const imagen = await eventsService.obtenerImagenEvento(eventId);
    if (!imagen) return res.status(404).json({ error: 'Este evento no tiene imagen' });
    res.set('Content-Type', imagen.mimeType);
    // La URL lleva ?v=<id de imagen>: si la imagen cambia, cambia la URL.
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(imagen.buffer);
  } catch (err) {
    console.error('Error al obtener la imagen del evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function postEvento(req, res) {
  const parsed = eventoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const reglas = await validarReglasEvento(parsed.data, req.user, null);
    if (reglas.error) return res.status(reglas.status).json({ error: reglas.error });

    const eventId = await eventsService.crearEvento(
      { ...parsed.data, campusId: reglas.campusId },
      { imagen: req.file?.buffer, creadoPor: req.user.userId },
    );
    notificaciones.nuevoEvento(eventId); // a los encuestadores de la sede, si tiene encuesta
    return res.status(201).json({ message: 'Evento registrado correctamente', eventId });
  } catch (err) {
    console.error('Error al registrar el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

// La sede ya la verificó requireSedeDelRecurso en la ruta (404/403).
async function patchEvento(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) return res.status(400).json({ error: 'ID inválido' });

  const parsed = eventoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const actual = await eventsService.obtenerEvento(eventId);
    if (!actual) return res.status(404).json({ error: 'Evento no encontrado' });

    const reglas = await validarReglasEvento(parsed.data, req.user, actual);
    if (reglas.error) return res.status(reglas.status).json({ error: reglas.error });

    await eventsService.editarEvento(
      eventId,
      { ...parsed.data, campusId: reglas.campusId },
      { imagen: req.file?.buffer, quitarImagen: parsed.data.quitarImagen, editadoPor: req.user.userId },
    );
    notificaciones.eventoCambiado(eventId, actual); // solo avisa si cambió fecha, hora, lugar o modalidad
    return res.json({ message: 'Evento actualizado correctamente' });
  } catch (err) {
    console.error('Error al editar el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function deleteEvento(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) return res.status(400).json({ error: 'ID inválido' });
  try {
    // A quién avisar se lee antes: la baja también da de baja las asignaciones.
    const avisarCancelacion = await notificaciones.prepararAvisoCancelacion(eventId);
    await eventsService.eliminarEvento(eventId, req.user.userId);
    avisarCancelacion();
    return res.json({ message: 'Evento eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

// Reglas para anotarse o bajarse: evento de su sede, con encuesta y que no haya pasado.
async function validarParticipacion(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) {
    res.status(400).json({ error: 'ID inválido' });
    return null;
  }
  const evento = await eventsService.obtenerEvento(eventId);
  if (!evento) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return null;
  }
  if (Number(evento.campusId) !== Number(req.user.campusId)) {
    res.status(403).json({ error: 'Solo puedes participar en eventos de tu sede' });
    return null;
  }
  if (!evento.hasIca && !evento.hasSpe) {
    res.status(400).json({ error: 'Este evento no lleva encuestas' });
    return null;
  }
  if (evento.fecha < eventsService.hoyEnBolivia()) {
    res.status(400).json({ error: 'El evento ya pasó' });
    return null;
  }
  return eventId;
}

async function postParticipacion(req, res) {
  try {
    const eventId = await validarParticipacion(req, res);
    if (!eventId) return undefined;
    await eventsService.participarEnEvento(eventId, req.user.userId);
    return res.json({ message: 'Te anotaste como encuestador en este evento', participando: true });
  } catch (err) {
    console.error('Error al anotarse en el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function deleteParticipacion(req, res) {
  try {
    const eventId = await validarParticipacion(req, res);
    if (!eventId) return undefined;
    await eventsService.dejarDeParticipar(eventId, req.user.userId);
    return res.json({ message: 'Ya no participas en este evento', participando: false });
  } catch (err) {
    console.error('Error al dejar de participar en el evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

// US55 — asignación de encuestadores. La sede ya la verificó
// requireSedeDelRecurso en la ruta (404 si no existe, 403 si es de otra sede).
async function getEncuestadoresEvento(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) return res.status(400).json({ error: 'ID inválido' });
  try {
    const evento = await eventsService.obtenerEvento(eventId);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    const { asignados, disponibles } = await eventsService.obtenerEncuestadoresEvento(eventId, evento.campusId);
    return res.json({ evento, asignados, disponibles });
  } catch (err) {
    console.error('Error al listar encuestadores del evento:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

// Reglas para asignar o quitar: el evento lleva encuesta y no pasó.
async function eventoParaAsignar(req, res) {
  const eventId = idDeRuta(req);
  if (!eventId) {
    res.status(400).json({ error: 'ID inválido' });
    return null;
  }
  const evento = await eventsService.obtenerEvento(eventId);
  if (!evento) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return null;
  }
  if (!evento.hasIca && !evento.hasSpe) {
    res.status(400).json({ error: 'Este evento no lleva encuestas, no se le asignan encuestadores' });
    return null;
  }
  if (evento.fecha < eventsService.hoyEnBolivia()) {
    res.status(400).json({ error: 'El evento ya pasó' });
    return null;
  }
  return evento;
}

async function postAsignarEncuestador(req, res) {
  const parsed = asignarEncuestadorSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const evento = await eventoParaAsignar(req, res);
    if (!evento) return undefined;
    const { userId } = parsed.data;
    if (!(await eventsService.esEncuestadorActivoDeSede(userId, evento.campusId))) {
      return res.status(400).json({ error: 'El usuario no es un encuestador activo de la sede del evento' });
    }
    await eventsService.asignarEncuestador(evento.id, userId, req.user.userId);
    notificaciones.asignadoAEvento({ eventId: evento.id, userId });
    return res.status(201).json({ message: 'Encuestador asignado correctamente' });
  } catch (err) {
    console.error('Error al asignar encuestador:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

async function deleteAsignacionEncuestador(req, res) {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'ID de encuestador inválido' });
  try {
    const evento = await eventoParaAsignar(req, res);
    if (!evento) return undefined;
    const quitado = await eventsService.quitarEncuestador(evento.id, userId, req.user.userId);
    if (!quitado) return res.status(404).json({ error: 'Ese encuestador no está asignado a este evento' });
    return res.json({ message: 'Encuestador quitado del evento' });
  } catch (err) {
    console.error('Error al quitar encuestador:', err);
    return res.status(500).json(ERROR_INTERNO);
  }
}

module.exports = {
  getEventos,
  getEvento,
  getImagenEvento,
  postEvento,
  patchEvento,
  deleteEvento,
  postParticipacion,
  deleteParticipacion,
  getEncuestadoresEvento,
  postAsignarEncuestador,
  deleteAsignacionEncuestador,
};
