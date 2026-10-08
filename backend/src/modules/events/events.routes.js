const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, optionalAuth, requireRole } = require('../../middlewares/auth.middleware');
const { requireSedeDelRecurso } = require('../../middlewares/sede.middleware');
const { obtenerCampusDelEvento } = require('./events.service');

// Todas las rutas de Sprint 2 ya conectadas (ver README.md): para implementar
// tu historia toca solo tu controlador/servicio, no este archivo.
const eventos = require('./events.controller'); // Santiago — US43–US47, US55
const misEventos = require('./events.misEventos.controller'); // Kevin Prieto — US56

// Imagen opcional del evento: en memoria y como BLOB en la tabla `image`.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esValido = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(esValido ? null : new Error('FORMATO_INVALIDO'), esValido);
  },
});

// Los errores de multer se devuelven como JSON, igual que el resto de la API.
function subirImagen(req, res, next) {
  upload.single('imagen')(req, res, (err) => {
    if (!err) return next();
    if (err.message === 'FORMATO_INVALIDO') {
      return res.status(400).json({ error: 'La imagen debe ser JPG o PNG' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen no puede pesar más de 5MB' });
    }
    console.error('Error al procesar la imagen del evento:', err);
    return res.status(400).json({ error: 'No se pudo procesar la imagen' });
  });
}

// Admin: solo eventos de su sede (404 si no existe, 403 si es de otra sede).
const sedeDelEvento = requireSedeDelRecurso((req) => obtenerCampusDelEvento(req.params.id));

// Públicas: la agenda de eventos la ve cualquiera.
router.get('/', optionalAuth, eventos.getEventos);

// Encuestador (va ANTES de /:id para que "mis-eventos" no se tome como id).
router.get('/mis-eventos', requireAuth, requireRole('encuestador'), misEventos.getMisEventos);

router.get('/:id', optionalAuth, eventos.getEvento);
router.get('/:id/image', eventos.getImagenEvento);

// El encuestador se anota solo (o se baja) en eventos con encuesta de su sede.
router.post('/:id/participacion', requireAuth, requireRole('encuestador'), eventos.postParticipacion);
router.delete('/:id/participacion', requireAuth, requireRole('encuestador'), eventos.deleteParticipacion);

// Gestión — Admin (solo su sede) y Superadmin (todas): usar
// requireSedeDelRecurso de middlewares/sede.middleware.js en las rutas /:id.
router.post('/', requireAuth, requireRole('admin', 'superadmin'), subirImagen, eventos.postEvento);
router.patch('/:id', requireAuth, requireRole('admin', 'superadmin'), sedeDelEvento, subirImagen, eventos.patchEvento);
router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), sedeDelEvento, eventos.deleteEvento);
router.get('/:id/encuestadores', requireAuth, requireRole('admin', 'superadmin'), eventos.getEncuestadoresEvento);
router.post('/:id/encuestadores', requireAuth, requireRole('admin', 'superadmin'), eventos.postAsignarEncuestador);
router.delete('/:id/encuestadores/:userId', requireAuth, requireRole('admin', 'superadmin'), eventos.deleteAsignacionEncuestador);

module.exports = router;
