// Kevin Prieto — US52 (formulario público de postulación).
// Solo se acepta si la convocatoria está vigente (hoy entre start_date y end_date).
// La postulación entra a applicant con status = ESTADO_POSTULANTE.PENDIENTE.
// Crea tu convocatorias.postulacion.service.js y .validation.js (Zod) al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getConvocatoriasAbiertas: pendiente('US52', 'Kevin Prieto'),
  postPostulacion: pendiente('US52', 'Kevin Prieto'),
};
