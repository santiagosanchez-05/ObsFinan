const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

// Encuestas del encuestador logueado, de ICA y SPE juntas (ver README.md).
const misEncuestas = require('./encuestas.controller'); // Kevin Prieto — US61

router.get('/mias', requireAuth, requireRole('encuestador'), misEncuestas.getMisEncuestas);

module.exports = router;
