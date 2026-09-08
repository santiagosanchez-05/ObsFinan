const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { getUsuarios, getUsuarioPorId, getFotoUsuario, getCampuses, postRegistrarUsuario } = require('./users.controller');

// En memoria: se procesa y se guarda como BLOB en la tabla `image`, nunca en disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esValido = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(esValido ? null : new Error('FORMATO_INVALIDO'), esValido);
  },
});

// Envolvemos multer a mano para que sus errores (formato inválido, archivo
// muy pesado) devuelvan JSON como el resto de la API, en vez de que se
// escapen al manejador de error genérico de Express (que no responde JSON).
function subirFoto(req, res, next) {
  upload.single('foto')(req, res, (err) => {
    if (!err) return next();
    if (err.message === 'FORMATO_INVALIDO') {
      return res.status(400).json({ error: 'La foto debe ser JPG o PNG' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La foto no puede pesar más de 5MB' });
    }
    console.error('Error al procesar la foto subida:', err);
    return res.status(400).json({ error: 'No se pudo procesar la foto' });
  });
}

// Panel de Usuarios: solo Superadmin lo ve (mismo criterio que la ruta del frontend).
router.get('/', requireAuth, requireRole('superadmin'), getUsuarios);
router.get('/campuses', requireAuth, requireRole('superadmin'), getCampuses);
router.post('/', requireAuth, requireRole('superadmin'), subirFoto, postRegistrarUsuario);
router.get('/:id/photo', requireAuth, requireRole('superadmin'), getFotoUsuario);
router.get('/:id', requireAuth, requireRole('superadmin'), getUsuarioPorId);

module.exports = router;
