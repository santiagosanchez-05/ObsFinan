const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireRole } = require('../../middlewares/auth.middleware');

// Todas las rutas de Sprint 2 ya conectadas (ver README.md): para implementar
// tu historia tocá solo tu controlador/servicio, no este archivo.
const eventos = require('./events.controller'); // Santiago — US43–US47, US55
const misEventos = require('./events.misEventos.controller'); // Kevin Prieto — US56

// Públicas: la agenda de eventos la ve cualquiera.
router.get('/', optionalAuth, eventos.getEventos);

// Encuestador (va ANTES de /:id para que "mis-eventos" no se tome como id).
router.get('/mis-eventos', requireAuth, requireRole('encuestador'), misEventos.getMisEventos);

router.get('/:id', optionalAuth, eventos.getEvento);

// Gestión — Admin (solo su sede) y Superadmin (todas): usar
// requireSedeDelRecurso de middlewares/sede.middleware.js en las rutas /:id.
router.post('/', requireAuth, requireRole('admin', 'superadmin'), eventos.postEvento);
router.patch('/:id', requireAuth, requireRole('admin', 'superadmin'), eventos.patchEvento);
router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), eventos.deleteEvento);
router.get('/:id/encuestadores', requireAuth, requireRole('admin', 'superadmin'), eventos.getEncuestadoresEvento);
router.post('/:id/encuestadores', requireAuth, requireRole('admin', 'superadmin'), eventos.postAsignarEncuestador);
router.delete('/:id/encuestadores/:userId', requireAuth, requireRole('admin', 'superadmin'), eventos.deleteAsignacionEncuestador);

module.exports = router;
