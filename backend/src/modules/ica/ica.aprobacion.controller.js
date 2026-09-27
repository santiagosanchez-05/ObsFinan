// Monserrat — US58 (bandeja de pendientes) y US59 (aprobar/rechazar).
// - Bandeja: cargas ICA con data_load.status = ESTADO_CARGA.PENDIENTE.
//   Admin ve solo su sede y Superadmin todas: sedeDeGestion(req) de
//   middlewares/sede.middleware.js.
// - Aprobar: status = ESTADO_CARGA.APROBADA y después
//   `await recalcularAgregadoIca(...)` (Liz, ica.scoring.service.js — US60).
// - Rechazar: status = ESTADO_CARGA.RECHAZADA (falta columna para el motivo,
//   ver docs/SPRINT2.md).
// - US59 también pide que dashboard, explorador y export cuenten solo
//   cargas APROBADAS (hoy no filtran por estado).
// Crea tu ica.aprobacion.service.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getPendientesIca: pendiente('US58', 'Monserrat'),
  patchEstadoCargaIca: pendiente('US59', 'Monserrat'),
};
