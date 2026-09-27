// Monserrat — US38 (carga por dataset) y US39 (historial).
// Crea tu spe.carga.service.js y spe.carga.validation.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  postUploadSpe: pendiente('US38', 'Monserrat'),
  getHistorialSpe: pendiente('US39', 'Monserrat'),
};
