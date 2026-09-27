const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

// Todas las rutas de Sprint 2 ya conectadas (ver README.md): para implementar
// tu historia tocá solo tu controlador/servicio, no este archivo.
const gestion = require('./convocatorias.gestion.controller'); // Kevin Alanes — US50, US53
const listado = require('./convocatorias.listado.controller'); // Kevin Prieto — US51
const postulacion = require('./convocatorias.postulacion.controller'); // Kevin Prieto — US52

// El formulario de postulación es público: límite por IP para que no lo usen
// para spamear (mismo criterio que /api/contacto).
const postulacionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Enviaste demasiadas postulaciones. Probá de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// Públicas (formulario de postulación).
router.get('/abiertas', postulacion.getConvocatoriasAbiertas);
router.post('/:id/postulaciones', postulacionLimiter, postulacion.postPostulacion);

// Gestión — Admin (solo su sede) y Superadmin (todas).
router.get('/', requireAuth, requireRole('admin', 'superadmin'), listado.getConvocatorias);
router.post('/', requireAuth, requireRole('admin', 'superadmin'), gestion.postConvocatoria);
router.get('/:id/postulaciones', requireAuth, requireRole('admin', 'superadmin'), gestion.getPostulantes);
router.patch('/postulaciones/:id', requireAuth, requireRole('admin', 'superadmin'), gestion.patchPostulante);

module.exports = router;
