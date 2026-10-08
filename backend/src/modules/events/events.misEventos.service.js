const pool = require('../../config/db');
const { ESTADO } = require('../../config/estados');

async function obtenerMisEventos(surveyorUserId) {
  const querySql = `
    SELECT
      e.event_id AS id,
      e.campus_id AS campusId,
      c.campus_name AS sede,
      e.title AS titulo,
      e.event_date AS fecha,
      e.event_time AS hora,
      e.modality AS modalidad,
      e.available_slots AS cuposDisponibles,
      e.location AS lugar,
      e.description AS descripcion,
      e.external_link AS enlaceExterno,
      e.has_ica,
      e.has_spe
    FROM event_surveyor es
    INNER JOIN event e ON e.event_id = es.event_id
    INNER JOIN campus c ON c.campus_id = e.campus_id
    WHERE es.surveyor_user_id = ?
      AND es.status = ?
      AND e.status = ?
    ORDER BY e.event_date DESC, e.event_time ASC, e.event_id DESC
  `;

  const resQuery = await pool.query(querySql, [surveyorUserId, ESTADO.ACTIVO, ESTADO.ACTIVO]);
  const filas = Array.isArray(resQuery) && Array.isArray(resQuery[0])
    ? resQuery[0]
    : (Array.isArray(resQuery) ? resQuery : []);

  return filas.map((fila) => ({
    id: fila.id,
    campusId: fila.campusId,
    sede: fila.sede,
    titulo: fila.titulo,
    fecha: fila.fecha,
    hora: fila.hora,
    modalidad: Number(fila.modalidad),
    cuposDisponibles: fila.cuposDisponibles,
    lugar: fila.lugar,
    descripcion: fila.descripcion || '',
    enlaceExterno: fila.enlaceExterno || null,
    has_ica: Number(fila.has_ica || 0),
    has_spe: Number(fila.has_spe || 0),
  }));
}

module.exports = {
  obtenerMisEventos,
};
