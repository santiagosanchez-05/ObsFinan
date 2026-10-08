const pool = require('../../config/db');
const { ESTADO, ESTADO_POSTULANTE } = require('../../config/estados');

async function obtenerListadoConvocatorias({ campusId, estado, busqueda }) {
  const condiciones = ['c.status = ?'];
  // El primer ? del SQL es el JOIN (applicant.status); el segundo es c.status.
  const parametros = [ESTADO_POSTULANTE.ELIMINADO, ESTADO.ACTIVO];

  if (campusId) {
    condiciones.push('c.campus_id = ?');
    parametros.push(Number(campusId));
  }

  if (estado === 'abiertas') {
    condiciones.push('CURDATE() BETWEEN c.start_date AND c.end_date');
  } else if (estado === 'cerradas') {
    condiciones.push('(CURDATE() < c.start_date OR CURDATE() > c.end_date)');
  }

  if (busqueda && String(busqueda).trim()) {
    condiciones.push('(c.title LIKE ? OR c.description LIKE ?)');
    parametros.push(`%${String(busqueda).trim()}%`, `%${String(busqueda).trim()}%`);
  }

  const querySql = `
    SELECT
      c.convocation_id,
      c.campus_id,
      c.title,
      c.start_date,
      c.end_date,
      c.description,
      c.status,
      c.created_at,
      cam.campus_name,
      COUNT(a.applicant_id) AS total_postulantes,
      MAX(CASE
        WHEN CURDATE() BETWEEN c.start_date AND c.end_date THEN 1
        ELSE 0
      END) AS esta_abierta
    FROM convocation c
    INNER JOIN campus cam ON cam.campus_id = c.campus_id
    LEFT JOIN applicant a ON a.convocation_id = c.convocation_id AND a.status != ?
    WHERE ${condiciones.join(' AND ')}
    GROUP BY
      c.convocation_id,
      c.campus_id,
      c.title,
      c.start_date,
      c.end_date,
      c.description,
      c.status,
      c.created_at,
      cam.campus_name
    ORDER BY c.created_at DESC, c.convocation_id DESC
  `;

  const resQuery = await pool.query(querySql, parametros);
  const filas = Array.isArray(resQuery) && Array.isArray(resQuery[0])
    ? resQuery[0]
    : (Array.isArray(resQuery) ? resQuery : []);

  return filas.map((fila) => {
    const estaAbierta = Number(fila.esta_abierta) === 1;
    return {
      id: fila.convocation_id,
      campusId: fila.campus_id,
      sede: fila.campus_name,
      titulo: fila.title,
      descripcion: fila.description || '',
      fechaInicio: fila.start_date,
      fechaFin: fila.end_date,
      estaAbierta,
      estado: estaAbierta ? 'abierta' : 'cerrada',
      totalPostulantes: Number(fila.total_postulantes || 0),
      creadoEn: fila.created_at,
    };
  });
}

module.exports = {
  obtenerListadoConvocatorias,
};
