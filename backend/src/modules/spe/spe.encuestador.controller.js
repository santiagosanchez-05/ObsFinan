// Kevin Alanes — US66 (el encuestador registra una encuesta SPE en un evento
// asignado; entra PENDIENTE hasta que un Superadmin la apruebe).
// Crea tu spe.encuestador.service.js y spe.encuestador.validation.js al implementar.
// Validar que el evento esté asignado al encuestador (event_surveyor) y que tenga has_spe = 1; si no, 400.
// Tabla: spe_survey_response (guardar event_id y surveyor_user_id = req.user.userId).
const pendiente = require('../../utils/pendiente');

module.exports = {
  postEncuestaSpe: pendiente('US66', 'Kevin Alanes'),
};
