const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaEncuestaIcaSchema, ENCABEZADOS_ESPERADOS } = require('./ica.validation');

// module: 1=ICA, 2=SPE; source_type: 1=individual, 2=archivo
const MODULE_ICA = 1;
const SOURCE_TYPE_ARCHIVO = 2;
const SOURCE_TYPE_INDIVIDUAL = 1;

const UPLOAD_DIR = path.join(__dirname, '../../../uploads/ica');

// Mapeo columna del Excel (en orden) -> campo del objeto en JS -> columna de ica_survey_response.
// El orden DEBE coincidir exactamente con ENCABEZADOS_ESPERADOS.
const CAMPOS_ENCUESTA = [
  ['q01ContributesFinancially', 'q01_contributes_financially'],
  ['q02Age', 'q02_age'],
  ['q03Sex', 'q03_sex'],
  ['q04EducationLevel', 'q04_education_level'],
  ['q05InsurancePurpose', 'q05_insurance_purpose'],
  ['q06MandatoryInsuranceActivity', 'q06_mandatory_insurance_activity'],
  ['q07MeaningPolicyholder', 'q07_meaning_policyholder'],
  ['q08MeaningClaim', 'q08_meaning_claim'],
  ['q09MeaningPremium', 'q09_meaning_premium'],
  ['q10MeaningDeductible', 'q10_meaning_deductible'],
  ['q11MeaningExclusions', 'q11_meaning_exclusions'],
  ['q12WhoSellsInsurance', 'q12_who_sells_insurance'],
  ['q13WhoIsHarmedByFraud', 'q13_who_is_harmed_by_fraud'],
  ['q14WhereToFileClaim', 'q14_where_to_file_claim'],
  ['q15HowAcquiredKnowledge', 'q15_how_acquired_knowledge'],
  ['q16BestMethodToImprove', 'q16_best_method_to_improve'],
  ['q17WhoImprovesEducation', 'q17_who_improves_education'],
  ['q18HowToProtectYourself', 'q18_how_to_protect_yourself'],
  ['q19AnnualInsuranceSpend', 'q19_annual_insurance_spend'],
  ['q20RetirementPreparation', 'q20_retirement_preparation'],
  ['q21InsuranceCultureLevel', 'q21_insurance_culture_level'],
  ['q22HasLifeInsurance', 'q22_has_life_insurance'],
  ['q23LifeInsuranceDuration', 'q23_life_insurance_duration'],
  ['q24ReasonAcquired', 'q24_reason_acquired'],
  ['q25PolicyReviewFrequency', 'q25_policy_review_frequency'],
  ['q26WouldSwitchProvider', 'q26_would_switch_provider'],
  ['q27SatisfactionCurrentPolicy', 'q27_satisfaction_current_policy'],
  ['q28LikelihoodFuturePurchase', 'q28_likelihood_future_purchase'],
  ['q29BarriersToPurchase', 'q29_barriers_to_purchase'],
  ['q30TrustInInsurers', 'q30_trust_in_insurers'],
  ['q31IncomePercentageWilling', 'q31_income_percentage_willing'],
  ['q32MostImportantFactor', 'q32_most_important_factor'],
];

function limpiar(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

// Parsea un Excel de UNA sola comuna: cada fila es una entrevista completa
// de 32 respuestas. Ya no lee "comuna" de ninguna columna — eso viene del
// formulario de carga (communityId), no del archivo.
function parsearArchivoIca(buffer) {
  const libro = xlsx.read(buffer, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: null });

  const encabezados = (filas[0] || []).slice(0, ENCABEZADOS_ESPERADOS.length).map((h) => String(h || '').trim());
  const encabezadosOk = ENCABEZADOS_ESPERADOS.every((esperado, i) => encabezados[i] === esperado);
  if (!encabezadosOk) {
    const err = new Error('ENCABEZADOS_INVALIDOS');
    err.detalle = { esperado: ENCABEZADOS_ESPERADOS, recibido: encabezados };
    throw err;
  }

  const datos = [];
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i] || [];

    // Fin de la tabla de datos: la primera pregunta (q01) vacía marca que
    // la hoja siguió con texto suelto (notas, hallazgos) después de los datos.
    const primeraRespuesta = limpiar(fila[0]);
    if (primeraRespuesta === null) {
      break;
    }

    const objetoFila = { filaExcel: i + 1 };
   CAMPOS_ENCUESTA.forEach(([campoJs], index) => {
  const valor = limpiar(fila[index]);

  if (valor && valor.toUpperCase().startsWith('N/A')) {
    objetoFila[campoJs] = null;
  } else {
    objetoFila[campoJs] = valor;
  }
});

    datos.push(objetoFila);
  }

  if (datos.length === 0) {
    throw new Error('ARCHIVO_SIN_FILAS');
  }

  return datos;
}

function validarFilas(datos) {
  const errores = [];
  const filasValidas = [];

  for (const fila of datos) {
    const parsed = filaEncuestaIcaSchema.safeParse(fila);
    if (!parsed.success) {
      errores.push({ fila: fila.filaExcel, errores: parsed.error.flatten().fieldErrors });
    } else {
      filasValidas.push(parsed.data);
    }
  }
 

  return { filasValidas, errores };
}

async function obtenerComunidadesPorSede(campusId) {
  const [comunidades] = await pool.query(
    `SELECT community_id, community_name FROM community WHERE campus_id = ? AND status = 1`,
    [campusId],
  );
  return comunidades;
}

function promedio(valores) {
  const validos = valores.filter((valor) => valor !== null && valor !== undefined);
  return validos.length ? validos.reduce((total, valor) => total + Number(valor), 0) / validos.length : null;
}

function transformarMedicion(row) {
  const dimensiones = [row.conocimiento, row.uso, row.educacion, row.prevision];
  return {
    id: row.ica_measurement_id,
    communityId: row.community_id,
    nombre: row.community_name,
    conocimiento: Number(row.conocimiento),
    uso: Number(row.uso),
    educacion: Number(row.educacion),
    prevision: Number(row.prevision),
    hombres: Number(row.ica_hombres),
    mujeres: Number(row.ica_mujeres),
    valor: Number(promedio(dimensiones).toFixed(1)),
  };
}

// ---------------------------------------------------------------------
// Usada por getDashboardIca,
// ---------------------------------------------------------------------
async function obtenerDashboard({ campusId, year, quarter, communityId }) {
  const condiciones = ['c.campus_id = ?', 'c.status = 1', 'm.status = 1'];
  const parametros = [campusId];

  if (year) {
    condiciones.push('m.year = ?');
    parametros.push(year);
  }
  if (quarter) {
    condiciones.push('m.quarter = ?');
    parametros.push(quarter);
  }
  if (communityId) {
    condiciones.push('m.community_id = ?');
    parametros.push(communityId);
  }

  const [filas] = await pool.query(
    `SELECT m.ica_measurement_id, m.community_id, c.community_name,
            m.year, m.quarter, m.knowledge_index AS conocimiento,
            m.usage_index AS uso, m.education_index AS educacion,
            m.foresight_index AS prevision, m.ica_male AS ica_hombres,
            m.ica_female AS ica_mujeres
       FROM ica_measurement m
       INNER JOIN community c ON c.community_id = m.community_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    parametros,
  );

  if (!filas.length) {
    return { periodo: null, comunas: [], dimensiones: [], brechas: [], metricas: null };
  }

  const periodo = { year: Number(filas[0].year), quarter: Number(filas[0].quarter) };
  const filasPeriodo = filas.filter((fila) => Number(fila.year) === periodo.year && Number(fila.quarter) === periodo.quarter);
  const comunas = filasPeriodo.map(transformarMedicion);
  const dimensiones = [
    { dimension: 'Conocimiento', valor: promedio(comunas.map((fila) => fila.conocimiento)) },
    { dimension: 'Uso', valor: promedio(comunas.map((fila) => fila.uso)) },
    { dimension: 'Educación', valor: promedio(comunas.map((fila) => fila.educacion)) },
    { dimension: 'Previsión', valor: promedio(comunas.map((fila) => fila.prevision)) },
  ].map((fila) => ({ ...fila, valor: Number(fila.valor.toFixed(1)) }));
  const brechas = comunas.map((fila) => ({ nombre: fila.nombre, hombres: fila.hombres, mujeres: fila.mujeres }));
  const mejor = comunas.reduce((actual, fila) => (fila.valor > actual.valor ? fila : actual), comunas[0]);
  const dimensionCritica = dimensiones.reduce((actual, fila) => (fila.valor < actual.valor ? fila : actual), dimensiones[0]);
  const brechaMayor = comunas.reduce((actual, fila) => (Math.abs(fila.hombres - fila.mujeres) > Math.abs(actual.hombres - actual.mujeres) ? fila : actual), comunas[0]);

  return {
    periodo,
    comunas,
    dimensiones,
    brechas,
    metricas: {
      general: Number(promedio(comunas.map((fila) => fila.valor)).toFixed(1)),
      mejorComuna: mejor,
      dimensionCritica,
      brechaGenero: { ...brechaMayor, valor: Number(Math.abs(brechaMayor.hombres - brechaMayor.mujeres).toFixed(1)) },
    },
  };
}


//postRegistroIca (US18).

async function registrarRegistroIndividual({ communityId, year, quarter, conocimiento, uso, educacion, prevision, icaHombres, icaMujeres, userId, campusId }) {
  const [comunidades] = await pool.query(
    'SELECT community_id FROM community WHERE community_id = ? AND campus_id = ? AND status = 1',
    [communityId, campusId],
  );
  if (!comunidades.length) throw new Error('COMUNIDAD_NO_ENCONTRADA');

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, 1, ?)`,
      [MODULE_ICA, SOURCE_TYPE_INDIVIDUAL, 'Registro individual', userId],
    );
    await conexion.query(
      `INSERT INTO ica_measurement
       (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [communityId, carga.insertId, year, quarter, conocimiento, uso, educacion, prevision, icaHombres, icaMujeres],
    );
    await conexion.commit();
    return { dataLoadId: carga.insertId };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

function rutaArchivo(dataLoadId, nombreOriginal) {
  const extension = path.extname(nombreOriginal) || '.xlsx';
  return path.join(UPLOAD_DIR, `${dataLoadId}${extension}`);
}

function guardarArchivoEnDisco(buffer, dataLoadId, nombreOriginal) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(rutaArchivo(dataLoadId, nombreOriginal), buffer);
}

function borrarArchivoSiExiste(dataLoadId, nombreOriginal) {
  try {
    const ruta = rutaArchivo(dataLoadId, nombreOriginal);
    if (fs.existsSync(ruta)) {
      fs.unlinkSync(ruta);
    }
  } catch (err) {
    console.error('No se pudo limpiar el archivo huérfano:', err);
  }
}

// Inserta las entrevistas de UN archivo (todas de la misma comuna+trimestre)
// en ica_survey_response. Ya NO toca ica_measurement — eso queda para
// cuando el motor de scoring esté listo (recalcularAgregado, bloqueado).
async function registrarCargaPorArchivo({ filasValidas, communityId, campusId, quarter, year, userId, nombreArchivo, buffer }) {
  const [comunidades] = await pool.query(
    'SELECT community_id FROM community WHERE community_id = ? AND campus_id = ? AND status = 1',
    [communityId, campusId],
  );
  if (!comunidades.length) {
    throw new Error('COMUNIDAD_NO_ENCONTRADA');
  }

  const conexion = await pool.getConnection();
  let dataLoadId;

  try {
    await conexion.beginTransaction();

    const [resultCarga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [MODULE_ICA, SOURCE_TYPE_ARCHIVO, nombreArchivo, filasValidas.length, userId],
    );
    dataLoadId = resultCarga.insertId;

    try {
      guardarArchivoEnDisco(buffer, dataLoadId, nombreArchivo);
    } catch (errArchivo) {
      console.error('No se pudo guardar el archivo en disco:', errArchivo);
      throw new Error('ARCHIVO_NO_GUARDADO');
    }

    const columnas = CAMPOS_ENCUESTA.map(([, col]) => col);
    for (const fila of filasValidas) {
      const valores = CAMPOS_ENCUESTA.map(([campoJs]) => fila[campoJs] ?? null);
      await conexion.query(
        `INSERT INTO ica_survey_response
           (data_load_id, community_id, year, quarter, surveyor_user_id, ${columnas.join(', ')}, status)
         VALUES (?, ?, ?, ?, ?, ${columnas.map(() => '?').join(', ')}, 1)`,
        [dataLoadId, communityId, year, quarter, userId, ...valores],
      );
    }

    // 🔒 Acá iría el llamado a recalcularAgregado(...) cuando el motor de
    // scoring esté listo. Por ahora ica_measurement no se toca.

    await conexion.commit();
    return { dataLoadId, totalInsertados: filasValidas.length };
  } catch (err) {
    await conexion.rollback();
    if (dataLoadId && err.message !== 'ARCHIVO_NO_GUARDADO') {
      borrarArchivoSiExiste(dataLoadId, nombreArchivo);
    }
    throw err;
  } finally {
    conexion.release();
  }
}

async function obtenerHistorialIca({ campusId, page = 1, pageSize = 10, tipo, communityId, busqueda }) {
  const offset = (page - 1) * pageSize;
  const condiciones = ['dl.module = ?', 'dl.status = 1'];
  const parametros = [MODULE_ICA];

  condiciones.push(`dl.data_load_id IN (
    SELECT sr.data_load_id FROM ica_survey_response sr
    INNER JOIN community c ON c.community_id = sr.community_id
    WHERE c.campus_id = ? AND sr.status = 1
  )`);
  parametros.push(campusId);

  if (tipo === 'individuales') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_INDIVIDUAL);
  } else if (tipo === 'archivos') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_ARCHIVO);
  }

  if (communityId) {
    condiciones.push(`dl.data_load_id IN (
      SELECT sr.data_load_id FROM ica_survey_response sr WHERE sr.community_id = ? AND sr.status = 1
    )`);
    parametros.push(communityId);
  }

  if (busqueda) {
    condiciones.push(`(
      dl.file_name LIKE ?
      OR dl.data_load_id IN (
        SELECT sr.data_load_id FROM ica_survey_response sr
        INNER JOIN community c ON c.community_id = sr.community_id
        WHERE c.community_name LIKE ?
      )
    )`);
    parametros.push(`%${busqueda}%`, `%${busqueda}%`);
  }

  const whereSql = condiciones.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM data_load dl WHERE ${whereSql}`, parametros);

  const [filas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.total_rows, dl.created_at
       FROM data_load dl
      WHERE ${whereSql}
      ORDER BY dl.created_at DESC
      LIMIT ? OFFSET ?`,
    [...parametros, pageSize, offset],
  );

  if (filas.length === 0) {
    return { registros: [], total, page, pageSize };
  }

  const ids = filas.map((f) => f.data_load_id);
  const [entrevistas] = await pool.query(
    `SELECT sr.data_load_id, sr.year, sr.quarter, sr.community_id, c.community_name
       FROM ica_survey_response sr
       INNER JOIN community c ON c.community_id = sr.community_id
      WHERE sr.data_load_id IN (?) AND sr.status = 1`,
    [ids],
  );

  const porCarga = new Map();
  for (const e of entrevistas) {
    if (!porCarga.has(e.data_load_id)) porCarga.set(e.data_load_id, []);
    porCarga.get(e.data_load_id).push(e);
  }

  const registros = filas.map((fila) => {
    const propias = porCarga.get(fila.data_load_id) || [];
    const comunasUnicas = [...new Set(propias.map((e) => e.community_name))];
    const periodosUnicos = [...new Set(propias.map((e) => `Q${e.quarter} ${e.year}`))];

    return {
      id: fila.data_load_id,
      tipo: fila.source_type === SOURCE_TYPE_ARCHIVO ? 'masiva' : 'manual',
      origen: fila.source_type === SOURCE_TYPE_ARCHIVO ? fila.file_name : 'Registro individual',
      comuna: comunasUnicas.length === 1 ? comunasUnicas[0] : `${comunasUnicas.length} comunas`,
      periodo: periodosUnicos.length === 1 ? periodosUnicos[0] : 'Varios períodos',
      registros: propias.length,
      fecha: fila.created_at,
    };
  });

  return { registros, total, page, pageSize };
}

module.exports = {
  parsearArchivoIca,
  validarFilas,
  registrarCargaPorArchivo,
  obtenerComunidadesPorSede,
  obtenerDashboard,
  registrarRegistroIndividual,
  obtenerHistorialIca,
};