// backend/src/modules/convocatorias/convocatorias.gestion.service.js
const pool = require("../../config/db");
const { ESTADO } = require("../../config/estados");

async function crearConvocatoria(
  { campus_id, title, start_date, end_date, description },
  userId,
) {
  // 1. Verificar que el campus existe y está activo
  const [campus] = await pool.query(
    "SELECT campus_id FROM campus WHERE campus_id = ? AND status = ?",
    [campus_id, ESTADO.ACTIVO],
  );
  if (!campus.length) throw new Error("CAMPUS_NO_ENCONTRADO");

  // 2. Insertar la convocatoria
  const [result] = await pool.query(
    `INSERT INTO convocation 
       (campus_id, title, start_date, end_date, description, status, created_modified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      campus_id,
      title,
      start_date,
      end_date,
      description || null,
      ESTADO.ACTIVO,
      userId,
    ],
  );

  return {
    convocation_id: result.insertId,
    campus_id,
    title,
    start_date,
    end_date,
    description: description || null,
    status: ESTADO.ACTIVO,
  };
}

module.exports = { crearConvocatoria };
