// Kevin Prieto — US61 (estado de mis encuestas: pendiente / aprobada / rechazada).
// El estado sale de data_load.status (ESTADO_CARGA en config/estados.js) de
// las cargas que hizo el encuestador (data_load.created_modified_by).
const encuestasService = require('./encuestas.service');

async function getMisEncuestas(req, res) {
  try {
    const surveyorUserId = req.user?.userId;
    if (!surveyorUserId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const encuestas = await encuestasService.obtenerMisEncuestas(surveyorUserId, {
      modulo: req.query.modulo,
      estado: req.query.estado,
    });

    return res.status(200).json(encuestas);
  } catch (err) {
    console.error('Error al obtener mis encuestas:', err);
    return res.status(500).json({ error: 'No se pudieron cargar tus encuestas' });
  }
}

module.exports = {
  getMisEncuestas,
};
