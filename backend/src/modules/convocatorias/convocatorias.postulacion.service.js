const pool = require('../../config/db');
const { ESTADO, ESTADO_POSTULANTE } = require('../../config/estados');

async function obtenerConvocatoriasAbiertas() {
  const querySql = `
    SELECT
      c.convocation_id AS id,
      c.campus_id AS campusId,
      cam.campus_name AS sede,
      c.title AS titulo,
      c.description AS descripcion,
      c.start_date AS fechaInicio,
      c.end_date AS fechaFin
    FROM convocation c
    INNER JOIN campus cam ON cam.campus_id = c.campus_id
    WHERE c.status = ?
      AND CURDATE() BETWEEN c.start_date AND c.end_date
    ORDER BY c.end_date ASC, c.title ASC
  `;

  const resQuery = await pool.query(querySql, [ESTADO.ACTIVO]);
  const filas = Array.isArray(resQuery) && Array.isArray(resQuery[0])
    ? resQuery[0]
    : (Array.isArray(resQuery) ? resQuery : []);

  return filas;
}

async function registrarPostulacion({ convocationId, datos }) {
  // 1. Verificar si la convocatoria existe y está abierta
  const checkSql = `
    SELECT
      convocation_id,
      CASE
        WHEN CURDATE() BETWEEN start_date AND end_date THEN 1
        ELSE 0
      END AS esta_abierta
    FROM convocation
    WHERE convocation_id = ? AND status = ?
  `;

  const resCheck = await pool.query(checkSql, [convocationId, ESTADO.ACTIVO]);
  const convocatorias = Array.isArray(resCheck) && Array.isArray(resCheck[0])
    ? resCheck[0]
    : (Array.isArray(resCheck) ? resCheck : []);

  if (!convocatorias.length) {
    throw new Error('CONVOCATORIA_NO_ENCONTRADA');
  }

  if (!convocatorias[0].esta_abierta) {
    throw new Error('CONVOCATORIA_CERRADA');
  }

  // 2. Verificar postulaciones duplicadas por correo
  const email = String(datos.email).trim().toLowerCase();

  const resDup = await pool.query(
    `SELECT applicant_id FROM applicant
     WHERE convocation_id = ? AND LOWER(email) = ? AND status != ?`,
    [convocationId, email, ESTADO_POSTULANTE.ELIMINADO]
  );
  const duplicados = Array.isArray(resDup) && Array.isArray(resDup[0])
    ? resDup[0]
    : (Array.isArray(resDup) ? resDup : []);

  if (duplicados.length > 0) {
    throw new Error('POSTULACION_DUPLICADA');
  }

  // 3. Registrar al postulante con estado PENDIENTE
  const insertSql = `
    INSERT INTO applicant (
      convocation_id,
      first_name,
      paternal_last_name,
      maternal_last_name,
      email,
      phone,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [resInsert] = await pool.query(insertSql, [
    convocationId,
    datos.first_name,
    datos.paternal_last_name,
    datos.maternal_last_name || null,
    email,
    datos.phone,
    ESTADO_POSTULANTE.PENDIENTE,
  ]);

  return resInsert?.insertId;
}

module.exports = {
  obtenerConvocatoriasAbiertas,
  registrarPostulacion,
};
