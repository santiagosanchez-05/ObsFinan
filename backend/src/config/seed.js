// Script de siembra: crea los datos mínimos para que el sistema funcione
// (roles, sede inicial, un usuario Superadmin de prueba).
// Es idempotente: si ya existe algo, no lo duplica.
//
// Uso: node src/config/seed.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

// Sprint 2: "cliente" ya no es un rol (el visitante no tiene cuenta).
const ROLES = ['superadmin', 'admin', 'encuestador'];
const CAMPUS = { nombre: 'Cochabamba', codigo: 'CBBA' };
const SEED_SUPERADMIN = {
  nombres: 'Santiago',
  apellidoPaterno: 'Admin',
  correo: 'superadmin@bienestarfinanciero.test',
  passwordTemporal: 'Temp-BienestarFinanciero2026',
};

async function seed() {
  // 1. Roles
  const roleIds = {};
  for (const nombre of ROLES) {
    const [existing] = await pool.query('SELECT role_id FROM role WHERE role_name = ?', [nombre]);
    if (existing.length) {
      roleIds[nombre] = existing[0].role_id;
      console.log(`✔ Rol "${nombre}" ya existía (id ${existing[0].role_id})`);
    } else {
      const [result] = await pool.query('INSERT INTO role (role_name) VALUES (?)', [nombre]);
      roleIds[nombre] = result.insertId;
      console.log(`+ Rol "${nombre}" creado (id ${result.insertId})`);
    }
  }

  // 2. Sede (campus)
  let campusId;
  const [existingCampus] = await pool.query('SELECT campus_id FROM campus WHERE campus_code = ?', [CAMPUS.codigo]);
  if (existingCampus.length) {
    campusId = existingCampus[0].campus_id;
    console.log(`✔ Sede "${CAMPUS.nombre}" ya existía (id ${campusId})`);
  } else {
    const [result] = await pool.query(
      'INSERT INTO campus (campus_name, campus_code) VALUES (?, ?)',
      [CAMPUS.nombre, CAMPUS.codigo],
    );
    campusId = result.insertId;
    console.log(`+ Sede "${CAMPUS.nombre}" creada (id ${campusId})`);
  }

  // 3. Usuario Superadmin de prueba
  const [existingUser] = await pool.query('SELECT user_id FROM user WHERE email = ?', [SEED_SUPERADMIN.correo]);
  if (existingUser.length) {
    console.log(`✔ Usuario "${SEED_SUPERADMIN.correo}" ya existía (id ${existingUser[0].user_id})`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_SUPERADMIN.passwordTemporal, 10);
    const [result] = await pool.query(
      `INSERT INTO user (role_id, campus_id, first_name, paternal_last_name, email, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [roleIds.superadmin, campusId, SEED_SUPERADMIN.nombres, SEED_SUPERADMIN.apellidoPaterno, SEED_SUPERADMIN.correo, passwordHash],
    );
    console.log(`+ Usuario Superadmin creado (id ${result.insertId})`);
    console.log(`  Correo: ${SEED_SUPERADMIN.correo}`);
    console.log(`  Contraseña temporal: ${SEED_SUPERADMIN.passwordTemporal}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Error al sembrar datos:', err.message);
  process.exit(1);
});
