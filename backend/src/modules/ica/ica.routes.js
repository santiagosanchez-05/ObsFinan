const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { getDashboardIca, getExploradorPreguntasIca, getComunidadesIca, postRegistroIca, postEntrevistaIca, postUploadIca, getHistorialIca, getDetalleArchivoIca, deleteRegistroIca, deleteArchivoIca, deleteRespuestaIca, verifyCargaIca, downloadArchivoIca } = require('./ica.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esValido = ['.xlsx', '.xls'].some((ext) => file.originalname.toLowerCase().endsWith(ext));
    cb(esValido ? null : new Error('FORMATO_INVALIDO'), esValido);
  },
});

router.get('/', requireAuth, getDashboardIca);
router.get('/questions', requireAuth, getExploradorPreguntasIca);
router.get('/comunidades', requireAuth, getComunidadesIca);
router.get('/historial', requireAuth, requireRole('admin', 'superadmin'), getHistorialIca);
router.get('/files/:id', requireAuth, requireRole('admin', 'superadmin'), getDetalleArchivoIca);
router.get('/files/:id/download', requireAuth, requireRole('admin', 'superadmin'), downloadArchivoIca);
router.post('/', requireAuth, requireRole('admin', 'superadmin'), postRegistroIca);
router.post('/entrevistas', requireAuth, requireRole('admin', 'superadmin'), postEntrevistaIca);
router.post('/upload', requireAuth, requireRole('admin', 'superadmin'), upload.single('archivo'), postUploadIca);
router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), deleteRegistroIca);
router.delete('/files/:id', requireAuth, requireRole('admin', 'superadmin'), deleteArchivoIca);
router.delete('/responses/:id', requireAuth, requireRole('admin', 'superadmin'), deleteRespuestaIca);
router.put('/files/:id/verify', requireAuth, requireRole('superadmin'), verifyCargaIca);

module.exports = router;