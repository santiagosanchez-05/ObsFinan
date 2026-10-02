// Kevin Prieto — US56 (el encuestador ve los eventos a los que fue asignado).
// Tablas: event_surveyor (surveyor_user_id = req.user.userId, status ACTIVO) + event.
// Devuelve has_ica y has_spe de cada evento para habilitar los botones correspondientes.
const misEventosService = require('./events.misEventos.service');

async function getMisEventos(req, res) {
  try {
    const surveyorUserId = req.user?.userId;
    if (!surveyorUserId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const eventos = await misEventosService.obtenerMisEventos(surveyorUserId);
    return res.status(200).json(eventos);
  } catch (err) {
    console.error('Error al obtener mis eventos:', err);
    return res.status(500).json({ error: 'No se pudieron cargar los eventos asignados' });
  }
}

module.exports = {
  getMisEventos,
};
