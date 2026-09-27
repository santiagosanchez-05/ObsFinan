// Monserrat — US62 (bandeja y aprobación de encuestas SPE, solo Superadmin).
// Al aprobar: data_load.status = ESTADO_CARGA.APROBADA y después
// `await calcularIndicesSpe(dataLoadId)` (Liz, spe.indices.service.js).
// Al rechazar: ESTADO_CARGA.RECHAZADA (ver docs/SPRINT2.md: falta columna para el motivo).
const pendiente = require('../../utils/pendiente');

module.exports = {
  getPendientesSpe: pendiente('US62', 'Monserrat'),
  patchEstadoCargaSpe: pendiente('US62', 'Monserrat'),
};
