const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const loadRoutes = require('./config/loadRoutes');

const app = express();

// Detrás de un proxy (Render, Vercel): así el límite de intentos usa la IP real
// del usuario y no la del proxy (si no, bloquearía a todos juntos).
app.set('trust proxy', 1);

// Build del frontend (solo existe en el despliegue de un solo servicio).
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const INDEX_HTML = path.join(FRONTEND_DIST, 'index.html');

// index.html trae un script en línea (tema claro/oscuro). Se permite por su hash,
// calculado al arrancar, en vez de habilitar 'unsafe-inline' para todos los scripts.
const hashesScripts = fs.existsSync(INDEX_HTML)
  ? [...fs.readFileSync(INDEX_HTML, 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      // El navegador convierte CRLF en LF antes de calcular el hash.
      .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`)
  : [];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'", ...hashesScripts],
        // El frontend usa Google Fonts y muestra fotos con URLs blob:/data:.
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  }),
);
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend corriendo correctamente' });
});

// Carga automática de todos los módulos en src/modules/*
loadRoutes(app);

// Despliegue en un solo servicio (Render): si existe el build del frontend
// (frontend/dist), el mismo Express lo sirve. Las rutas de React (/login,
// /ica, ...) devuelven index.html; las de /api siguen yendo a los módulos.
if (fs.existsSync(INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api(\/|$)).*/, (req, res) => {
    res.sendFile(INDEX_HTML);
  });
}

module.exports = app;
