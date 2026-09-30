// US39 historial SPE.
const pool = require('../../config/db');
const { MODULO, ESTADO_CARGA } = require('../../config/estados');

// data_load.source_type: 1 = individual, 2 = archivo
const SOURCE_TYPE_INDIVIDUAL = 1;
const SOURCE_TYPE_ARCHIVO = 2;

const COLUMNAS_ORDEN = {
  sector: ['sector_nombre'],
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

async function obtenerHistorialSpe({ page = 1, pageSize = 10, tipo, estado, periodo, busqueda, sortBy, sortDir }) {
  const offset = (page - 1) * pageSize;

  // Eliminadas (status 0) nunca se muestran.
  const condiciones = ['dl.module = ?', 'dl.status != 0'];
  const parametros = [MODULO.SPE];

  if (tipo === 'individuales') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_INDIVIDUAL);
  } else if (tipo === 'archivos') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_ARCHIVO);
  }

  if (estado) {
    condiciones.push('dl.status = ?');
    parametros.push(ESTADO_FILTRO[estado]);
  }

  if (periodo) {
    const [year, semester] = periodo.split('-').map(Number);
    condiciones.push('sr.year = ? AND sr.semester = ?');
    parametros.push(year, semester);
  }

  if (busqueda) {
    condiciones.push('(dl.file_name LIKE ? OR sr.s1_export_sector LIKE ?)');
    parametros.push(`%${busqueda}%`, `%${busqueda}%`);
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
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at,
            MIN(sr.s1_export_sector) AS sector_nombre,
            COUNT(DISTINCT sr.s1_export_sector) AS num_sectores,
            MIN(sr.year) AS year, MIN(sr.semester) AS semester,
            COUNT(DISTINCT CONCAT(sr.year, '-', sr.semester)) AS num_periodos,
            COUNT(sr.spe_survey_response_id) AS total_registros
       FROM data_load dl
       INNER JOIN spe_survey_response sr
         ON sr.data_load_id = dl.data_load_id AND sr.status = 1
      WHERE ${whereSql}
      GROUP BY dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?`,
    [...parametros, pageSize, offset],
  );

  const registros = filas.map((fila) => {
    const esArchivo = Number(fila.source_type) === SOURCE_TYPE_ARCHIVO;
    return {
      id: fila.data_load_id,
      tipo: esArchivo ? 'masiva' : 'manual',
      origen: esArchivo ? fila.file_name : 'Registro individual',
      sector: Number(fila.num_sectores) === 1 ? fila.sector_nombre : `${fila.num_sectores} sectores`,
      periodo: Number(fila.num_periodos) === 1 ? `Semestre ${fila.semester} - ${fila.year}` : 'Varios períodos',
      registros: Number(fila.total_registros),
      fecha: fila.created_at,
      estado: ESTADO_TEXTO[Number(fila.status)] || 'Desconocido',
      estadoCodigo: Number(fila.status),
    };
  });

  return { registros, total, page, pageSize };
}

// Tarjetas de resumen + opciones del filtro de periodo (independientes de los filtros aplicados).
async function obtenerResumenHistorialSpe() {
  const [[resumen]] = await pool.query(
    `SELECT COUNT(sr.spe_survey_response_id) AS total_registros,
            COUNT(DISTINCT CASE WHEN dl.source_type = ? THEN dl.data_load_id END) AS total_archivos,
            COALESCE(SUM(dl.source_type = ?), 0) AS carga_manual,
            COALESCE(SUM(dl.status = ?), 0) AS pendientes
       FROM data_load dl
       INNER JOIN spe_survey_response sr
         ON sr.data_load_id = dl.data_load_id AND sr.status = 1
      WHERE dl.module = ? AND dl.status != 0`,
    [SOURCE_TYPE_ARCHIVO, SOURCE_TYPE_INDIVIDUAL, ESTADO_CARGA.PENDIENTE, MODULO.SPE],
  );

  const [periodos] = await pool.query(
    `SELECT DISTINCT sr.year, sr.semester
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE sr.status = 1 AND dl.module = ? AND dl.status != 0
      ORDER BY sr.year DESC, sr.semester DESC`,
    [MODULO.SPE],
  );

  return {
    resumen: {
      totalRegistros: Number(resumen.total_registros),
      totalArchivos: Number(resumen.total_archivos),
      cargaManual: Number(resumen.carga_manual),
      pendientes: Number(resumen.pendientes),
    },
    periodos: periodos.map((p) => ({
      valor: `${p.year}-${p.semester}`,
      etiqueta: `Semestre ${p.semester} - ${p.year}`,
    })),
  };
}

module.exports = { obtenerHistorialSpe, obtenerResumenHistorialSpe };