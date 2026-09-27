// Kevin Prieto — US56 (el encuestador ve los eventos a los que fue asignado).
// Tablas: event_surveyor (surveyor_user_id = req.user.userId, status ACTIVO) + event.
// Devolver has_ica y has_spe de cada evento: el frontend muestra el botón
// "Registrar encuesta ICA" y/o "Registrar encuesta SPE" según esas columnas
// (pendientes de agregar a la BD, ver docs/SPRINT2.md).
// Crea tu events.misEventos.service.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getMisEventos: pendiente('US56', 'Kevin Prieto'),
};
