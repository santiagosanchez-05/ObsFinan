const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { postLogin, postForgotPassword, postVerifyCode, postResetPassword } = require('./auth.controller');

// TODO(Santiago): volver a windowMs: 15 * 60 * 1000 antes de entregar —
// bajado a 1 minuto temporalmente para poder probar seguido durante el desarrollo.
// Máximo 10 intentos de login por IP cada 15 minutos — evita fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// TODO(Santiago): volver a windowMs: 15 * 60 * 1000 antes de entregar —
// bajado a 1 minuto temporalmente para poder probar seguido durante el desarrollo.
// Máximo 3 pedidos de código por IP cada 15 minutos — evita spamear correos.
const forgotPasswordLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 3,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Máximo 10 intentos de código por IP cada 15 minutos — evita fuerza bruta
// sobre el código de 6 dígitos (1 millón de combinaciones posibles).
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, postLogin);
router.post('/forgot-password', forgotPasswordLimiter, postForgotPassword);
router.post('/verify-code', verifyCodeLimiter, postVerifyCode);
router.post('/reset-password', postResetPassword);

module.exports = router;
