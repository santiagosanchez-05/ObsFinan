const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireRole } = require('../../middlewares/auth.middleware');
const {
  getDashboardIca,
  getExploradorPreguntasIca,
  getComunidadesIca,
  postRegistroIca,
  postEntrevistaIca,
  getHistorialIca,
  getDetalleRegistroIca,
  deleteRegistroIca,
  verifyCargaIca,
  downloadRegistroIca,
  getExportIca,
  getExportRespuestasIca,
} = require('./ica.controller');
// Sprint 2 — Monserrat (US58/US59). Rutas ya conectadas abajo.
const aprobacion = require('./ica.aprobacion.controller');


// Lectura pública (el visitante sin cuenta ve los dashboards). Todo lo que
// carga, borra, verifica o expone respuestas individuales sigue protegido.
router.get('/', optionalAuth, getDashboardIca);
router.get('/questions', optionalAuth, getExploradorPreguntasIca);
router.get('/export', optionalAuth, getExportIca);
router.get('/comunidades', requireAuth, getComunidadesIca);
router.get('/survey-export', requireAuth, requireRole('admin', 'superadmin'), getExportRespuestasIca);
router.get('/historial', requireAuth, requireRole('admin', 'superadmin'), getHistorialIca);
router.get('/:id/download', requireAuth, requireRole('admin', 'superadmin'), downloadRegistroIca);
router.post('/', requireAuth, requireRole('admin', 'superadmin'), postRegistroIca);
// US57 (Liz): sumar el rol 'encuestador'. Si lo manda un encuestador, el body trae eventId y
// se valida que el evento esté asignado a él (event_surveyor) y tenga has_ica = 1; si no, 400.
router.post('/entrevistas', requireAuth, requireRole('admin', 'superadmin', 'encuestador'), postEntrevistaIca);
router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), deleteRegistroIca);
// Todos los registros son individuales (la carga por archivo/dataset se quitó).
router.get('/registros/:id', requireAuth, requireRole('admin', 'superadmin'), getDetalleRegistroIca);
router.put('/registros/:id/verify', requireAuth, requireRole('superadmin'), verifyCargaIca);

// Sprint 2 — bandeja de aprobación de encuestas de los encuestadores.
router.get('/pendientes', requireAuth, requireRole('admin', 'superadmin'), aprobacion.getPendientesIca);
router.patch('/cargas/:id/estado', requireAuth, requireRole('admin', 'superadmin'), aprobacion.patchEstadoCargaIca);

module.exports = router;