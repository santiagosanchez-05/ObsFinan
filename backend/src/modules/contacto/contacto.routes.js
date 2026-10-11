const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getSedesContacto, postContacto, getCorreoContacto } = require('./contacto.controller');

// Rutas públicas (sin requireAuth): las usa el formulario de contacto.
// Máximo 5 mensajes por IP cada 15 minutos — evita que se use para spamear
// los correos de los administradores.
const contactoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Enviaste demasiados mensajes. Intenta de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  // En los tests se manda el formulario muchas veces seguidas desde la misma IP.
  skip: () => process.env.NODE_ENV === 'test',
});

router.get('/sedes', getSedesContacto);
router.get('/correo', getCorreoContacto); // correo del footer
router.post('/', contactoLimiter, postContacto);

module.exports = router;
