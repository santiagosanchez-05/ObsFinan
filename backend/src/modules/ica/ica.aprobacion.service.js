const pool = require('../../config/db');
const { MODULO, ESTADO_CARGA } = require('../../config/estados');
const { ENCABEZADOS_ESPERADOS } = require('./ica.validation');
const { CAMPOS_ENCUESTA } = require('./ica.service');
const { recalcularAgregadoIca } = require('./ica.scoring.service');


// Mismo valor que NO_APLICA en Aprobaciones.PanelRevision.jsx
const NO_APLICA = '__no_aplica__';

const ESTADO_DESTINO = {
  aprobada: ESTADO_CARGA.APROBADA,
  rechazada: ESTADO_CARGA.RECHAZADA,
};

// ============================================================
// Estructura del panel "Revisar"
// ============================================================

const BLOQUES_ICA = [
  { grupo: 'Perfil', preguntas: [1, 2, 3, 4] },
  { grupo: 'Conocimiento de seguros', preguntas: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { grupo: 'Educación y cultura aseguradora', preguntas: [15, 16, 17, 21] },
  { grupo: 'Protección y previsión', preguntas: [18, 19, 20] },
  { grupo: 'Seguro de vida', preguntas: [22, 23, 24, 25, 26, 27] },
  { grupo: 'Intención y percepción', preguntas: [28, 29, 30, 31, 32] },
];

// Preguntas 23 a 27: solo aplican si q22 (tiene seguro de vida) = 'Sí'
const SOLO_CON_SEGURO = [23, 24, 25, 26, 27];
const SOLO_SIN_SEGURO = [28, 29];

const vacio = (v) => v === null || v === undefined || v === '';

// Fila SQL -> { 1: '...', 2: '...', ..., 32: '...' }
function filaANumeradas(fila) {
  const r = {};
  CAMPOS_ENCUESTA.forEach(([, columna], i) => {
    r[i + 1] = fila[columna];
  });
  return r;
}


// ¿Le tocaba responder la pregunta n?
function aplica(n, r) {
  if (SOLO_CON_SEGURO.includes(n)) return r[22] === 'Sí';
  if (SOLO_SIN_SEGURO.includes(n)) return r[22] === 'No';
  return true;
}

function armarRespuestas(fila) {
  const r = filaANumeradas(fila);

  return BLOQUES_ICA.map(({ grupo, preguntas }) => ({
    grupo,
    items: preguntas.map((n) => {
      const pregunta = ENCABEZADOS_ESPERADOS[n - 1];

      // No le correspondía -> "No aplica"
      if (!aplica(n, r)) return [pregunta, NO_APLICA];

      let valor = r[n];

      // Le correspondía y está vacío -> "Sin responder"
      if (vacio(valor)) return [pregunta, null];

      // Texto libre de "Otra (Especifique)"
      if (n === 24 && valor === 'Otra (Especifique)' && fila.q24b_reason_other_text) {
        valor = `Otra: ${fila.q24b_reason_other_text}`;
      }

      return [pregunta, valor];
    }),
  }));
}
// ============================================================
// US58 — Bandeja de pendientes ICA
// ============================================================

// campusId = null -> todas las sedes (Superadmin).
async function obtenerPendientesIca({ campusId = null } = {}) {
  const parametros = [MODULO.ICA, ESTADO_CARGA.PENDIENTE];
  if (campusId) parametros.push(campusId);

  const [filas] = await pool.query(
    `SELECT dl.data_load_id,
            dl.source_type,
            dl.file_name,
            dl.created_at,
            u.first_name,
            u.paternal_last_name,
            u.maternal_last_name,
            MIN(camp.campus_name) AS sede,
            GROUP_CONCAT(DISTINCT c.community_name SEPARATOR '||') AS comunas,
            MIN(sr.year) AS year,
            MIN(sr.quarter) AS quarter,
            MIN(ev.title) AS evento,
            COUNT(DISTINCT CONCAT(sr.year, '-', sr.quarter)) AS num_periodos,
            COUNT(sr.survey_response_id) AS total_registros
       FROM data_load dl
       INNER JOIN ica_survey_response sr
         ON sr.data_load_id = dl.data_load_id
        AND sr.status = 1
       INNER JOIN community c ON c.community_id = sr.community_id
       INNER JOIN campus camp ON camp.campus_id = c.campus_id
       LEFT JOIN event ev ON ev.event_id = sr.event_id
       LEFT JOIN user u ON u.user_id = dl.created_modified_by
      WHERE dl.module = ?
        AND dl.status = ?
        ${campusId ? 'AND c.campus_id = ?' : ''}
      GROUP BY dl.data_load_id, dl.source_type, dl.file_name, dl.created_at,
               u.first_name, u.paternal_last_name, u.maternal_last_name
      ORDER BY dl.created_at ASC, dl.data_load_id ASC`,
    parametros,
  );

  // Respuestas de todas las cargas pendientes en una sola consulta
  const respuestasPorCarga = new Map();

  if (filas.length) {
    const [respuestas] = await pool.query(
      `SELECT sr.*, c.community_name
         FROM ica_survey_response sr
         INNER JOIN community c ON c.community_id = sr.community_id
        WHERE sr.data_load_id IN (?)
          AND sr.status = 1`,
      [filas.map((f) => f.data_load_id)],
    );

    respuestas.forEach((r) => {
      if (!respuestasPorCarga.has(r.data_load_id)) respuestasPorCarga.set(r.data_load_id, []);
      respuestasPorCarga.get(r.data_load_id).push(r);
    });
  }

  // Todas las encuestas son individuales (la carga por archivo se quitó).
  const pendientes = filas.map((fila) => {
    const detalle = respuestasPorCarga.get(fila.data_load_id) || [];

    return {
      id: fila.data_load_id,
      tipo: 'manual',
      origen: 'Registro individual',
      zonas: (fila.comunas ? fila.comunas.split('||') : []).sort(),
      periodo:
        Number(fila.num_periodos) === 1
          ? `${fila.quarter}T ${fila.year}`
          : 'Varios períodos',
      registros: Number(fila.total_registros),
      encuestador:
        [fila.first_name, fila.paternal_last_name, fila.maternal_last_name]
          .filter(Boolean)
          .join(' ') || 'Usuario del sistema',
      sede: fila.sede || '-',
      fecha: fila.created_at,
      evento: fila.evento || 'Sin evento (registro directo)',
      respuestas: detalle.length ? armarRespuestas(detalle[0]) : [],
    };
  });

  return { pendientes, total: pendientes.length };
}

// ============================================================
// US59 — Aprobar / rechazar carga ICA
// ============================================================
//
// Errores:
//   CARGA_NO_ENCONTRADA -> 404 (también si la carga es de otra sede)
//   CARGA_YA_REVISADA   -> 409
async function cambiarEstadoCargaIca({ dataLoadId, estado, motivo, revisorId, campusId = null }) {
  const nuevoEstado = ESTADO_DESTINO[estado];
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    // FOR UPDATE: dos revisores no pueden resolver la misma carga a la vez
    const [cargas] = await conexion.query(
      `SELECT data_load_id, status
         FROM data_load
        WHERE data_load_id = ?
          AND module = ?
          AND status != 0
        FOR UPDATE`,
      [dataLoadId, MODULO.ICA],
    );
    if (!cargas.length) throw new Error('CARGA_NO_ENCONTRADA');

    // Combinaciones comuna + período de la carga (y su sede)
    const [combinaciones] = await conexion.query(
      `SELECT DISTINCT sr.community_id, sr.year, sr.quarter, c.campus_id
         FROM ica_survey_response sr
         INNER JOIN community c ON c.community_id = sr.community_id
        WHERE sr.data_load_id = ?
          AND sr.status = 1`,
      [dataLoadId],
    );
    if (!combinaciones.length) throw new Error('CARGA_NO_ENCONTRADA');

    // Admin: solo cargas de su sede
    if (campusId && combinaciones.some((c) => Number(c.campus_id) !== Number(campusId))) {
      throw new Error('CARGA_NO_ENCONTRADA');
    }

    if (Number(cargas[0].status) !== ESTADO_CARGA.PENDIENTE) {
      throw new Error('CARGA_YA_REVISADA');
    }

    const nota =
      estado === 'rechazada'
        ? (typeof motivo === 'string' ? motivo.trim() : '') || null
        : null;

    await conexion.query(
      `UPDATE data_load
          SET status = ?,
              reviewed_by = ?,
              reviewed_at = NOW(),
              review_note = ?
        WHERE data_load_id = ?`,
      [nuevoEstado, revisorId, nota, dataLoadId],
    );

    // Al aprobar se recalcula el agregado de cada comuna+período afectado,
    // dentro de la misma transacción: si falla el cálculo, no queda aprobada.
    if (estado === 'aprobada') {
      for (const { community_id: communityId, year, quarter } of combinaciones) {
        await recalcularAgregadoIca({
          conexion,
          communityId,
          year,
          quarter,
          dataLoadId,
        });
      }
    }

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }

  return { id: dataLoadId, estado };
}

module.exports = { obtenerPendientesIca, cambiarEstadoCargaIca };