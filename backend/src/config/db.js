const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Bolivia (La Paz) no tiene horario de verano: UTC-4 todo el año.
  // Esto asegura que las fechas se guarden/lean igual sin importar en qué
  // servidor corra el backend (dev local, AlwaysData, Render, etc.).
  timezone: '-04:00',
});

module.exports = pool;