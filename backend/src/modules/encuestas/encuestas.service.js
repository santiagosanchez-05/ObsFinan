const pool = require('../../config/db');
const { ESTADO_CARGA, MODULO, TIPO_CARGA } = require('../../config/estados');

async function obtenerMisEncuestas(surveyorUserId, filtros = {}) {
  const condiciones = [
    'dl.created_modified_by = ?',
    'dl.status != ?',
  ];
  const parametros = [surveyorUserId, ESTADO_CARGA.ELIMINADA];

  if (filtros.modulo) {
    const mod = String(filtros.modulo).toUpperCase();
    if (mod === 'ICA') {
      condiciones.push('dl.module = ?');
      parametros.push(MODULO.ICA);
    } else if (mod === 'SPE') {
      condiciones.push('dl.module = ?');
      parametros.push(MODULO.SPE);
    }
  }

  if (filtros.estado) {
    const est = String(filtros.estado).toLowerCase();
    if (est === 'pendiente') {
      condiciones.push('dl.status = ?');
      parametros.push(ESTADO_CARGA.PENDIENTE);
    } else if (est === 'aprobada') {
      condiciones.push('dl.status = ?');
      parametros.push(ESTADO_CARGA.APROBADA);
    } else if (est === 'rechazada') {
      condiciones.push('dl.status = ?');
      parametros.push(ESTADO_CARGA.RECHAZADA);
    }
  }

  const querySql = `
    SELECT
      dl.data_load_id AS id,
      dl.module AS moduloId,
      dl.source_type AS tipoCargaId,
      dl.file_name AS nombreArchivo,
      dl.total_rows AS totalRegistros,
      dl.status AS statusId,
      dl.review_note AS motivoRechazo,
      dl.reviewed_at AS fechaRevision,
      dl.created_at AS fechaCarga,
      rev.first_name AS revisorNombre,
      rev.paternal_last_name AS revisorApellido
    FROM data_load dl
    LEFT JOIN user rev ON rev.user_id = dl.reviewed_by
    WHERE ${condiciones.join(' AND ')}
    ORDER BY dl.created_at DESC, dl.data_load_id DESC
  `;

  const resQuery = await pool.query(querySql, parametros);
  const filas = Array.isArray(resQuery) && Array.isArray(resQuery[0])
    ? resQuery[0]
    : (Array.isArray(resQuery) ? resQuery : []);

  return filas.map((fila) => {
    let estadoTexto = 'pendiente';
    if (fila.statusId === ESTADO_CARGA.APROBADA) {
      estadoTexto = 'aprobada';
    } else if (fila.statusId === ESTADO_CARGA.RECHAZADA) {
      estadoTexto = 'rechazada';
    }

    const moduloTexto = fila.moduloId === MODULO.ICA ? 'ICA' : 'SPE';
    const tipoCargaTexto = fila.tipoCargaId === TIPO_CARGA.ARCHIVO ? 'archivo' : 'individual';
    const revisadoPor = fila.revisorNombre
      ? [fila.revisorNombre, fila.revisorApellido].filter(Boolean).join(' ')
      : null;

    return {
      id: fila.id,
      modulo: moduloTexto,
      tipoCarga: tipoCargaTexto,
      nombre: fila.nombreArchivo || `Encuesta ${moduloTexto} (${tipoCargaTexto})`,
      totalRegistros: Number(fila.totalRegistros || 1),
      status: fila.statusId,
      estado: estadoTexto,
      fechaCarga: fila.fechaCarga,
      fechaRevision: fila.fechaRevision,
      revisadoPor,
      motivoRechazo: fila.motivoRechazo || null,
    };
  });
}

module.exports = {
  obtenerMisEncuestas,
};
