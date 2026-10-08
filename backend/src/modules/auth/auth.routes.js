const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  postLogin,
  postForgotPassword,
  postVerifyCode,
  postResetPassword,
  postChangePassword,
  postFirstPassword,
  putUpdateProfile,
} = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth.middleware');


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
router.post('/change-password', requireAuth, postChangePassword); // requiere sesión activa, no correo/código
// Primer ingreso: solo con el token que trae la marca de contraseña temporal.
router.post('/first-password', requireAuth, postFirstPassword);
router.put('/update-profile', requireAuth, putUpdateProfile);

module.exports = router;

