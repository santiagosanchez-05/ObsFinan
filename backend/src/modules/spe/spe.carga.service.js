// US39 historial SPE.
const pool = require('../../config/db');
const { MODULO, ESTADO_CARGA } = require('../../config/estados');

const COLUMNAS_ORDEN = {
  sector: ['sector_nombre'],
  departamento: ['departamento_nombre'],
  periodo: ['year', 'semester'],
  fecha: ['dl.created_at'],
};

const ESTADO_TEXTO = {
  [ESTADO_CARGA.PENDIENTE]: 'Pendiente',
  [ESTADO_CARGA.APROBADA]: 'Aprobada',
  [ESTADO_CARGA.RECHAZADA]: 'Rechazada',
};

const ESTADO_FILTRO = {
  pendiente: ESTADO_CARGA.PENDIENTE,
  aprobada: ESTADO_CARGA.APROBADA,
  rechazada: ESTADO_CARGA.RECHAZADA,
};

async function obtenerHistorialSpe({ page = 1, pageSize = 10, estado, year, semester, departamento, busqueda, sortBy, sortDir }) {
  const offset = (page - 1) * pageSize;

  // Eliminadas (status 0) nunca se muestran.
  const condiciones = ['dl.module = ?', 'dl.status != 0'];
  const parametros = [MODULO.SPE];

  if (estado) {
    condiciones.push('dl.status = ?');
    parametros.push(ESTADO_FILTRO[estado]);
  }

  if (year) {
    condiciones.push('sr.year = ?');
    parametros.push(year);
  }
  if (semester) {
    condiciones.push('sr.semester = ?');
    parametros.push(semester);
  }

  if (departamento) {
    condiciones.push('sr.s1_department = ?'); // <-- ajusta el nombre de la columna si es otro
    parametros.push(departamento);
  }

  if (busqueda) {
    condiciones.push('sr.s1_export_sector LIKE ?');
    parametros.push(`%${busqueda}%`);
  }

  const whereSql = condiciones.join(' AND ');
  const columnasOrden = COLUMNAS_ORDEN[sortBy] || COLUMNAS_ORDEN.fecha;
  const direccion = sortDir === 'asc' ? 'ASC' : 'DESC';
  const orderSql = [...columnasOrden.map((col) => `${col} ${direccion}`), 'dl.data_load_id DESC'].join(', ');

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM (
       SELECT dl.data_load_id
         FROM data_load dl
         INNER JOIN spe_survey_response sr
           ON sr.data_load_id = dl.data_load_id AND sr.status = 1
        WHERE ${whereSql}
        GROUP BY dl.data_load_id
     ) sub`,
    parametros,
  );

  const [filas] = await pool.query(
    `SELECT dl.data_load_id, dl.status, dl.created_at,
            MIN(sr.s1_export_sector) AS sector_nombre,
            MIN(sr.s1_department) AS departamento_nombre,
            MIN(sr.year) AS year, MIN(sr.semester) AS semester
       FROM data_load dl
       INNER JOIN spe_survey_response sr
         ON sr.data_load_id = dl.data_load_id AND sr.status = 1
      WHERE ${whereSql}
      GROUP BY dl.data_load_id, dl.status, dl.created_at
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?`,
    [...parametros, pageSize, offset],
  );

  const registros = filas.map((fila) => ({
    id: fila.data_load_id,
    sector: fila.sector_nombre,
    departamento: fila.departamento_nombre,
    periodo: `Semestre ${fila.semester} - ${fila.year}`,
    fecha: fila.created_at,
    estado: ESTADO_TEXTO[Number(fila.status)] || 'Desconocido',
    estadoCodigo: Number(fila.status),
  }));

  return { registros, total, page, pageSize };
}

// Tarjetas de resumen + opciones de filtros (independientes de los filtros aplicados).
async function obtenerResumenHistorialSpe() {
  const [[resumen]] = await pool.query(
    `SELECT COUNT(sr.spe_survey_response_id) AS total_registros,
            COALESCE(SUM(dl.status = ?), 0) AS pendientes,
            COALESCE(SUM(dl.status = ?), 0) AS aprobadas,
            COALESCE(SUM(dl.status = ?), 0) AS rechazadas
       FROM data_load dl
       INNER JOIN spe_survey_response sr
         ON sr.data_load_id = dl.data_load_id AND sr.status = 1
      WHERE dl.module = ? AND dl.status != 0`,
    [ESTADO_CARGA.PENDIENTE, ESTADO_CARGA.APROBADA, ESTADO_CARGA.RECHAZADA, MODULO.SPE],
  );

  const [anios] = await pool.query(
    `SELECT DISTINCT sr.year
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE sr.status = 1 AND dl.module = ? AND dl.status != 0
      ORDER BY sr.year DESC`,
    [MODULO.SPE],
  );

  const [departamentos] = await pool.query(
    `SELECT DISTINCT sr.s1_department AS departamento
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE sr.status = 1 AND dl.module = ? AND dl.status != 0
        AND sr.s1_department IS NOT NULL
      ORDER BY sr.s1_department`,
    [MODULO.SPE],
  );

  return {
    resumen: {
      totalRegistros: Number(resumen.total_registros),
      pendientes: Number(resumen.pendientes),
      aprobadas: Number(resumen.aprobadas),
      rechazadas: Number(resumen.rechazadas),
    },
    anios: anios.map((a) => Number(a.year)),
    departamentos: departamentos.map((d) => d.departamento),
  };
}

module.exports = { obtenerHistorialSpe, obtenerResumenHistorialSpe };