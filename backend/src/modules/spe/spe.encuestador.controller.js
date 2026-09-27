// Kevin Alanes — US66 (el encuestador registra una encuesta SPE en un evento
// asignado; entra PENDIENTE hasta que un Superadmin la apruebe).
// Crea tu spe.encuestador.service.js y spe.encuestador.validation.js al implementar.
// Validar que el evento esté asignado al encuestador (event_surveyor) y que tenga has_spe = 1; si no, 400.
// Ojo: spe_measurement todavía no tiene event_id ni surveyor_user_id (ver docs/SPRINT2.md).
const pendiente = require('../../utils/pendiente');

module.exports = {
  postEncuestaSpe: pendiente('US66', 'Kevin Alanes'),
};
