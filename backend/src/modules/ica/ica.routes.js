const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { getDashboardIca, getComunidadesIca, postRegistroIca, postUploadIca, getHistorialIca } = require('./ica.controller');


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esValido = ['.xlsx', '.xls'].some((ext) => file.originalname.toLowerCase().endsWith(ext));
    cb(esValido ? null : new Error('FORMATO_INVALIDO'), esValido);
  },
});

router.get('/', requireAuth, getDashboardIca);
router.get('/comunidades', requireAuth, getComunidadesIca);
router.get('/historial', requireAuth, requireRole('admin', 'superadmin'), getHistorialIca);
router.post('/', requireAuth, requireRole('admin', 'superadmin'), postRegistroIca);
router.post('/upload', requireAuth, requireRole('admin', 'superadmin'), upload.single('archivo'), postUploadIca);

module.exports = router;