const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { postUploadIca } = require('./ica.controller');

// En memoria: el archivo se procesa y se descarta, no hace falta guardarlo en disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esValido = ['.xlsx', '.xls'].some((ext) => file.originalname.toLowerCase().endsWith(ext));
    cb(esValido ? null : new Error('FORMATO_INVALIDO'), esValido);
  },
});

router.post('/upload', requireAuth, requireRole('admin', 'superadmin'), upload.single('archivo'), postUploadIca);

module.exports = router;