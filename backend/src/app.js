const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const loadRoutes = require('./config/loadRoutes');

const app = express();

app.use(helmet());
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

module.exports = app;
