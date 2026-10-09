const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireRole } = require('../../middlewares/auth.middleware');

// Cada controlador es de UNA persona (ver README.md). Este archivo ya tiene
// todas las rutas de Sprint 2 conectadas: no hace falta tocarlo para
// implementar tu historia — solo tu controlador/servicio.
const dashboard = require('./spe.dashboard.controller'); // Liz — US34, US35
const registro = require('./spe.registro.controller'); // Liz — US37
const carga = require('./spe.carga.controller'); // Monserrat — US39 (historial)
const aprobacion = require('./spe.aprobacion.controller'); // Monserrat — US62
const archivos = require('./spe.archivos.controller'); // Kevin Prieto — US40, US41, US42
const encuestador = require('./spe.encuestador.controller'); // Kevin Alanes — US66

// Públicas (el visitante ve el dashboard sin cuenta).
router.get('/', optionalAuth, dashboard.getDashboardSpe);
router.get('/export', optionalAuth, archivos.getExportSpe);

// Encuestador: carga encuestas que quedan pendientes de aprobación.
router.post('/encuestas', requireAuth, requireRole('encuestador'), encuestador.postEncuestaSpe);

// Gestión — solo Superadmin (SPE es nacional, no hay Admin de sede).
router.post('/', requireAuth, requireRole('superadmin'), registro.postRegistroSpe);
router.get('/historial', requireAuth, requireRole('superadmin'), carga.getHistorialSpe);
router.get('/pendientes', requireAuth, requireRole('superadmin'), aprobacion.getPendientesSpe);
router.patch('/cargas/:id/estado', requireAuth, requireRole('superadmin'), aprobacion.patchEstadoCargaSpe);
// Todos los registros son individuales (la carga por archivo/dataset se quitó).
router.get('/registros/:id', requireAuth, requireRole('superadmin'), archivos.getDetalleRegistroSpe);
router.delete('/:id', requireAuth, requireRole('superadmin'), archivos.deleteRegistroSpe);

module.exports = router;
