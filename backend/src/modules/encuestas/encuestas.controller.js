// Kevin Prieto — US61 (estado de mis encuestas: pendiente / aprobada / rechazada).
// El estado sale de data_load.status (ESTADO_CARGA en config/estados.js) de
// las cargas que hizo el encuestador (data_load.created_modified_by).
// Crea tu encuestas.service.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getMisEncuestas: pendiente('US61', 'Kevin Prieto'),
};
