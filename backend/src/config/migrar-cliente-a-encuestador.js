// Migración Sprint 2: "Cliente" deja de ser un rol (el visitante ve los
// dashboards sin cuenta) y aparece el rol Encuestador. Las cuentas cliente
// existentes NO se borran: pasan a ser encuestadores.
// Es idempotente: se puede correr varias veces y en cualquier base.
//
// Uso: node src/config/migrar-cliente-a-encuestador.js
require('dotenv').config();
const pool = require('./db');

async function buscarRol(nombre) {
  const [rows] = await pool.query('SELECT role_id FROM role WHERE role_name = ?', [nombre]);
  return rows[0]?.role_id ?? null;
}

async function migrar() {
  const clienteId = await buscarRol('cliente');
  const encuestadorId = await buscarRol('encuestador');

  if (!clienteId) {
    if (!encuestadorId) {
      const [result] = await pool.query("INSERT INTO role (role_name) VALUES ('encuestador')");
      console.log(`+ Rol "encuestador" creado (id ${result.insertId})`);
    } else {
      console.log(`✔ No hay rol "cliente"; "encuestador" ya existe (id ${encuestadorId}). Nada que hacer.`);
    }
    process.exit(0);
  }

  const [clientes] = await pool.query('SELECT user_id, email FROM user WHERE role_id = ?', [clienteId]);
  console.log(`Cuentas cliente a convertir: ${clientes.length}`);
  clientes.forEach((u) => console.log(`  - id ${u.user_id} (${u.email})`));

  if (!encuestadorId) {
    // Caso normal: se renombra el rol, así todas sus cuentas pasan a
    // encuestador de una sola vez y no queda un rol huérfano.
    await pool.query("UPDATE role SET role_name = 'encuestador', status = 1 WHERE role_id = ?", [clienteId]);
    console.log(`+ Rol "cliente" (id ${clienteId}) renombrado a "encuestador"`);
  } else {
    // Si alguien ya había creado "encuestador" aparte: se mueven las cuentas
    // y "cliente" queda desactivado (no se borra por la FK de user.role_id).
    await pool.query('UPDATE user SET role_id = ? WHERE role_id = ?', [encuestadorId, clienteId]);
    await pool.query('UPDATE role SET status = 0 WHERE role_id = ?', [clienteId]);
    console.log(`+ Cuentas movidas a "encuestador" (id ${encuestadorId}); rol "cliente" desactivado`);
  }

  process.exit(0);
}

migrar().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
