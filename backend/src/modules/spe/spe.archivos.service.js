const pool = require('../../config/db');
const { ESTADO, ESTADO_CARGA, MODULO, TIPO_CARGA } = require('../../config/estados');

function escaparCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[";\n\r,]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function generarCsv(filas) {
  if (!filas || filas.length === 0) {
    return '';
  }
  const columnas = Object.keys(filas[0]);
  const encabezado = columnas.join(';');
  const lineas = filas.map((fila) =>
    columnas.map((col) => escaparCsv(fila[col])).join(';')
  );
  return [encabezado, ...lineas].join('\n');
}

async function exportarDatasetSpe(filtros = {}) {
  const condiciones = [
    'dl.module = ?',
    'dl.status = ?',
    'sr.status = ?',
  ];
  const parametros = [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO];

  if (filtros.year) {
    condiciones.push('sr.year = ?');
    parametros.push(Number(filtros.year));
  }
  if (filtros.semester) {
    condiciones.push('sr.semester = ?');
    parametros.push(Number(filtros.semester));
  }
  if (filtros.department) {
    condiciones.push('sr.s1_department = ?');
    parametros.push(filtros.department);
  }
  if (filtros.sector) {
    condiciones.push('sr.s1_export_sector = ?');
    parametros.push(filtros.sector);
  }
  if (filtros.size) {
    condiciones.push('sr.s1_company_size = ?');
    parametros.push(filtros.size);
  }

  const querySql = `
    SELECT
      sr.spe_survey_response_id AS id,
      sr.year,
      sr.semester,
      sr.s1_department AS departamento,
      sr.s1_export_sector AS sectorExportador,
      sr.s1_company_size AS tamanoEmpresa,
      sr.s1_years_exporting AS anosExportando,
      sr.s1_markets_served AS mercadosAtendidos,
      sr.s1_export_income_share AS porcentajeIngresosExportacion,
      sr.s1_main_destination AS destinoPrincipal,
      sr.s2_bolivia_economy_score AS economiaBoliviaScore,
      sr.s2_company_economy_score AS economiaEmpresaScore,
      sr.s2_export_sector_score AS sectorExportadorScore,
      sr.s2_gdp_expectation AS expectativaPib,
      sr.s2_inflation_expectation AS expectativaInflacion,
      sr.s2_exchange_rate_expectation AS expectativaTipoCambio,
      sr.s2_company_exports_expectation AS expectativaExportaciones,
      sr.s3_plans_new_markets AS planesNuevosMercados,
      sr.s3_expansion_priority_score AS prioridadExpansionScore,
      sr.s3_market_analysis_frequency AS frecuenciaAnalisisMercado,
      sr.s3_access_modality AS modalidadAcceso,
      sr.s4_has_certifications AS tieneCertificaciones,
      sr.s5_best_trade_agreement AS mejorAcuerdoComercial,
      sr.s5_main_export_barrier AS barreraPrincipalExportacion,
      sr.s6_fx_shortage_impact AS impactoEscasezDivisas,
      sr.s7_highest_impact_measure AS medidaMayorImpacto,
      sr.s8_invested_last_12m AS invirtioUltimos12m,
      sr.s8_will_invest_next_12m AS invertiraProximos12m,
      sis.iee,
      sis.ice,
      sis.iie,
      sis.icie
    FROM spe_survey_response sr
    INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
    LEFT JOIN spe_index_score sis ON sis.spe_survey_response_id = sr.spe_survey_response_id
    WHERE ${condiciones.join(' AND ')}
    ORDER BY sr.year DESC, sr.semester DESC, sr.spe_survey_response_id ASC
  `;

  const resQuery = await pool.query(querySql, parametros);
  const filas = Array.isArray(resQuery) && Array.isArray(resQuery[0]) ? resQuery[0] : (Array.isArray(resQuery) ? resQuery : []);
  return filas;
}

async function obtenerDetalleArchivoSpe(dataLoadId) {
  const [cargas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.total_rows, dl.status, dl.created_at,
            u.first_name, u.paternal_last_name
     FROM data_load dl
     LEFT JOIN user u ON u.user_id = dl.created_modified_by
     WHERE dl.data_load_id = ? AND dl.module = ? AND dl.status != ?`,
    [dataLoadId, MODULO.SPE, ESTADO_CARGA.ELIMINADA]
  );

  if (!cargas.length) {
    throw new Error('ARCHIVO_NO_ENCONTRADO');
  }

  const carga = cargas[0];

  const [registros] = await pool.query(
    `SELECT sr.*,
            sis.iee, sis.ice, sis.iie, sis.icie
     FROM spe_survey_response sr
     LEFT JOIN spe_index_score sis ON sis.spe_survey_response_id = sr.spe_survey_response_id
     WHERE sr.data_load_id = ? AND sr.status = ?
     ORDER BY sr.spe_survey_response_id ASC`,
    [dataLoadId, ESTADO.ACTIVO]
  );

  let estadoTexto = 'pendiente';
  if (carga.status === ESTADO_CARGA.APROBADA) estadoTexto = 'aprobada';
  else if (carga.status === ESTADO_CARGA.RECHAZADA) estadoTexto = 'rechazada';

  const subidoPor = [carga.first_name, carga.paternal_last_name].filter(Boolean).join(' ') || 'Administrador SPE';

  return {
    archivo: {
      id: carga.data_load_id,
      nombre: carga.file_name || 'Archivo SPE',
      tipoCarga: Number(carga.source_type),
      tipoCargaTexto: Number(carga.source_type) === TIPO_CARGA.ARCHIVO ? 'Archivo masivo' : 'Registro individual',
      fechaCarga: carga.created_at,
      subidoPor,
      totalRegistros: registros.length,
      status: carga.status,
      estado: estadoTexto,
    },
    registros,
  };
}

async function eliminarArchivoSpe(dataLoadId) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [cargas] = await conexion.query(
      `SELECT data_load_id FROM data_load
       WHERE data_load_id = ? AND module = ? AND status != ?`,
      [dataLoadId, MODULO.SPE, ESTADO_CARGA.ELIMINADA]
    );

    if (!cargas.length) {
      throw new Error('ARCHIVO_NO_ENCONTRADO');
    }

    await conexion.query(
      `UPDATE spe_survey_response
       SET status = ?
       WHERE data_load_id = ? AND status = ?`,
      [ESTADO.INACTIVO, dataLoadId, ESTADO.ACTIVO]
    );

    await conexion.query(
      `UPDATE data_load
       SET status = ?
       WHERE data_load_id = ?`,
      [ESTADO_CARGA.ELIMINADA, dataLoadId]
    );

    await conexion.commit();
    return true;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

async function eliminarRegistroIndividualSpe(id) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    // 1. Intentar buscar por data_load_id (carga individual)
    const [cargas] = await conexion.query(
      `SELECT data_load_id, source_type FROM data_load
       WHERE data_load_id = ? AND module = ? AND status != ?`,
      [id, MODULO.SPE, ESTADO_CARGA.ELIMINADA]
    );

    if (cargas.length > 0) {
      const dataLoadId = cargas[0].data_load_id;
      await conexion.query(
        `UPDATE spe_survey_response
         SET status = ?
         WHERE data_load_id = ?`,
        [ESTADO.INACTIVO, dataLoadId]
      );
      await conexion.query(
        `UPDATE data_load
         SET status = ?
         WHERE data_load_id = ?`,
        [ESTADO_CARGA.ELIMINADA, dataLoadId]
      );
      await conexion.commit();
      return true;
    }

    // 2. Si no es data_load_id, buscar por spe_survey_response_id
    const [respuestas] = await conexion.query(
      `SELECT sr.spe_survey_response_id, sr.data_load_id
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
       WHERE sr.spe_survey_response_id = ? AND dl.module = ? AND sr.status = ?`,
      [id, MODULO.SPE, ESTADO.ACTIVO]
    );

    if (!respuestas.length) {
      throw new Error('REGISTRO_NO_ENCONTRADO');
    }

    const { spe_survey_response_id, data_load_id } = respuestas[0];
    await conexion.query(
      `UPDATE spe_survey_response
       SET status = ?
       WHERE spe_survey_response_id = ?`,
      [ESTADO.INACTIVO, spe_survey_response_id]
    );

    await conexion.query(
      `UPDATE data_load
       SET total_rows = (
         SELECT COUNT(*) FROM spe_survey_response
         WHERE data_load_id = ? AND status = ?
       )
       WHERE data_load_id = ?`,
      [data_load_id, ESTADO.ACTIVO, data_load_id]
    );

    await conexion.commit();
    return true;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = {
  exportarDatasetSpe,
  generarCsv,
  obtenerDetalleArchivoSpe,
  eliminarArchivoSpe,
  eliminarRegistroIndividualSpe,
};
