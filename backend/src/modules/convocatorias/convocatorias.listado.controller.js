// Kevin Prieto — US51 (listado de convocatorias abiertas y cerradas).
// Abierta/cerrada se calcula con start_date/end_date contra la fecha de hoy.
// Admin ve solo su sede y Superadmin todas: sedeDeGestion(req) de
// middlewares/sede.middleware.js. Crea tu convocatorias.listado.service.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getConvocatorias: pendiente('US51', 'Kevin Prieto'),
};
