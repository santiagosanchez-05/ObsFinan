// Crea un usuario Admin y un usuario Cliente de prueba.
// Uso: node src/config/seed-extra-users.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const NUEVOS_USUARIOS = [
  {
    rol: 'admin',
    nombres: 'Ana',
    apellidoPaterno: 'Admin',
    correo: 'admin@bienestarfinanciero.test',
    passwordTemporal: 'Temp-BienestarFinanciero2026',
  },
  {
    rol: 'cliente',
    nombres: 'Carlos',
    apellidoPaterno: 'Cliente',
    correo: 'cliente@bienestarfinanciero.test',
    passwordTemporal: 'Temp-BienestarFinanciero2026',
  },
];

async function seedExtraUsers() {
  const [roles] = await pool.query('SELECT role_id, role_name FROM role');
  const roleIdPorNombre = Object.fromEntries(roles.map((r) => [r.role_name, r.role_id]));

  const [campus] = await pool.query('SELECT campus_id FROM campus WHERE campus_code = ?', ['CBBA']);
  if (!campus.length) {
    throw new Error('No existe la sede Cochabamba (CBBA) — corré primero npm run seed');
  }
  const campusId = campus[0].campus_id;

  for (const u of NUEVOS_USUARIOS) {
    const [existente] = await pool.query('SELECT user_id FROM user WHERE email = ?', [u.correo]);
    if (existente.length) {
      // Ya existe (probablemente el intento fallido por SQL) — actualizamos el hash
      // para asegurarnos de que quede el correcto, generado por bcrypt real.
      const passwordHash = await bcrypt.hash(u.passwordTemporal, 10);
      await pool.query('UPDATE user SET password_hash = ? WHERE email = ?', [passwordHash, u.correo]);
      console.log(`↻ "${u.correo}" ya existía — hash actualizado`);
      continue;
    }

    const roleId = roleIdPorNombre[u.rol];
    const passwordHash = await bcrypt.hash(u.passwordTemporal, 10);
    const [result] = await pool.query(
      `INSERT INTO user (role_id, campus_id, first_name, paternal_last_name, email, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roleId, campusId, u.nombres, u.apellidoPaterno, u.correo, passwordHash],
    );
    console.log(`+ Usuario "${u.rol}" creado (id ${result.insertId})`);
  }

  process.exit(0);
}

seedExtraUsers().catch((err) => {
  console.error('Error al crear usuarios:', err.message);
  process.exit(1);
});
