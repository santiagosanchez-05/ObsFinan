const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaEncuestaIcaSchema, ENCABEZADOS_ESPERADOS, OPCIONES } = require('./ica.validation');

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
async function obtenerDashboard({ campusId, year, quarter, communityId, dimension }) {
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
    `SELECT MIN(m.ica_measurement_id) AS ica_measurement_id, m.community_id, c.community_name,
            m.year, m.quarter,
            AVG(m.knowledge_index) AS conocimiento,
            AVG(m.usage_index) AS uso,
            AVG(m.education_index) AS educacion,
            AVG(m.foresight_index) AS prevision,
            AVG(m.ica_male) AS ica_hombres,
            AVG(m.ica_female) AS ica_mujeres
       FROM ica_measurement m
       INNER JOIN community c ON c.community_id = m.community_id
      WHERE ${condiciones.join(' AND ')}
      GROUP BY m.community_id, c.community_name, m.year, m.quarter
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    parametros,
  );

  // ------------------------------------------------------------
  // OPCIONES REALES PARA LOS FILTROS
  // ------------------------------------------------------------

  const [opciones] = await pool.query(
    `SELECT DISTINCT
            m.year,
            m.quarter,
            m.community_id,
            c.community_name
       FROM ica_measurement m
       INNER JOIN community c ON c.community_id = m.community_id
      WHERE c.campus_id = ?
        AND c.status = 1
        AND m.status = 1
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    [campusId],
  );

  const periodosDisponibles = [
    ...new Map(
      opciones.map((fila) => [
        `${fila.year}-${fila.quarter}`,
        {
          year: Number(fila.year),
          quarter: Number(fila.quarter),
        },
      ]),
    ).values(),
  ];

  const comunidadesDisponibles = [
    ...new Map(
      opciones.map((fila) => [
        fila.community_id,
        {
          communityId: Number(fila.community_id),
          nombre: fila.community_name,
        },
      ]),
    ).values(),
  ];

  const dimensionesDisponibles = [
    'Conocimiento',
    'Uso',
    'Educación',
    'Previsión',
  ];

  // ------------------------------------------------------------
  // SI NO HAY DATOS PARA EL FILTRO ACTUAL
  // ------------------------------------------------------------

  if (!filas.length) {
    return {
      periodo: null,
      comunas: [],
      dimensiones: [],
      brechas: [],
      metricas: null,
      opcionesFiltros: {
        periodos: periodosDisponibles,
        comunidades: comunidadesDisponibles,
        dimensiones: dimensionesDisponibles,
      },
    };
  }

  // ------------------------------------------------------------
  // PERÍODO DEL DASHBOARD
  // ------------------------------------------------------------

  const periodo = {
    year: Number(filas[0].year),
    quarter: Number(filas[0].quarter),
  };

  const filasPeriodo = filas.filter(
    (fila) =>
      Number(fila.year) === periodo.year &&
      Number(fila.quarter) === periodo.quarter,
  );

  const comunas = filasPeriodo.map(transformarMedicion);

  // ------------------------------------------------------------
  // DIMENSIONES
  // ------------------------------------------------------------

  const dimensionesCalculadas = [
    {
      dimension: 'Conocimiento',
      valor: promedio(comunas.map((fila) => fila.conocimiento)),
    },
    {
      dimension: 'Uso',
      valor: promedio(comunas.map((fila) => fila.uso)),
    },
    {
      dimension: 'Educación',
      valor: promedio(comunas.map((fila) => fila.educacion)),
    },
    {
      dimension: 'Previsión',
      valor: promedio(comunas.map((fila) => fila.prevision)),
    },
  ].map((fila) => ({
    ...fila,
    valor: Number(fila.valor.toFixed(1)),
  }));
  const dimensiones = dimension
    ? dimensionesCalculadas.filter((fila) => fila.dimension === dimension)
    : dimensionesCalculadas;

  // ------------------------------------------------------------
  // BRECHA DE GÉNERO
  // ------------------------------------------------------------

  const brechas = comunas.map((fila) => ({
    nombre: fila.nombre,
    hombres: fila.hombres,
    mujeres: fila.mujeres,
  }));

  // ------------------------------------------------------------
  // MÉTRICAS
  // ------------------------------------------------------------

  const mejor = comunas.reduce(
    (actual, fila) =>
      fila.valor > actual.valor ? fila : actual,
    comunas[0],
  );

  const dimensionCritica = dimensiones.reduce(
    (actual, fila) =>
      fila.valor < actual.valor ? fila : actual,
    dimensiones[0],
  );

  const brechaMayor = comunas.reduce(
    (actual, fila) =>
      Math.abs(fila.hombres - fila.mujeres) >
        Math.abs(actual.hombres - actual.mujeres)
        ? fila
        : actual,
    comunas[0],
  );

  return {
    periodo,
    comunas,
    dimensiones,
    brechas,

    metricas: {
      general: Number(
        promedio(comunas.map((fila) => fila.valor)).toFixed(1),
      ),

      mejorComuna: mejor,

      dimensionCritica,

      brechaGenero: {
        ...brechaMayor,
        valor: Number(
          Math.abs(
            brechaMayor.hombres - brechaMayor.mujeres,
          ).toFixed(1),
        ),
      },
    },


    opcionesFiltros: {
      periodos: periodosDisponibles,
      comunidades: comunidadesDisponibles,
      dimensiones: dimensionesDisponibles,
    },
  };
}

const DIMENSIONES_PREGUNTAS = [
  'Conocimiento', 'Conocimiento', 'Conocimiento', 'Conocimiento',
  'Conocimiento', 'Conocimiento', 'Conocimiento', 'Conocimiento',
  'Conocimiento', 'Conocimiento', 'Conocimiento', 'Conocimiento',
  'Conocimiento', 'Conocimiento', 'Educación', 'Educación',
  'Educación', 'Educación', 'Uso', 'Previsión', 'Previsión',
  'Previsión', 'Previsión', 'Previsión', 'Previsión', 'Previsión',
  'Previsión', 'Previsión', 'Previsión', 'Uso', 'Uso', 'Uso',
];

async function obtenerExploradorPreguntas({ campusId, year, quarter, communityId, dimension }) {
  const columnas = CAMPOS_ENCUESTA.map(([, columna]) => columna);
  const condiciones = ['c.campus_id = ?', 'c.status = 1', 'sr.status = 1'];
  const parametros = [campusId];

  if (year) {
    condiciones.push('sr.year = ?');
    parametros.push(year);
  }
  if (quarter) {
    condiciones.push('sr.quarter = ?');
    parametros.push(quarter);
  }
  if (communityId) {
    condiciones.push('sr.community_id = ?');
    parametros.push(communityId);
  }

  const [filas] = await pool.query(
    `SELECT sr.year, sr.quarter, ${columnas.join(', ')}
       FROM ica_survey_response sr
       INNER JOIN community c ON c.community_id = sr.community_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY sr.year DESC, sr.quarter DESC`,
    parametros,
  );

  let filasPeriodo = filas;
  let periodo = null;
  if (filas.length) {
    periodo = { year: Number(filas[0].year), quarter: Number(filas[0].quarter) };
    if (!year && !quarter) {
      filasPeriodo = filas.filter((fila) => Number(fila.year) === periodo.year && Number(fila.quarter) === periodo.quarter);
    }
  }

  const preguntas = CAMPOS_ENCUESTA.map(([campo, columna], index) => {
    const conteos = new Map();
    filasPeriodo.forEach((fila) => {
      const valor = fila[columna] === null || fila[columna] === undefined || fila[columna] === ''
        ? 'No sabe / No responde'
        : String(fila[columna]);
      conteos.set(valor, (conteos.get(valor) || 0) + 1);
    });
    const total = filasPeriodo.length;
    const respuestas = [...conteos.entries()]
      .map(([respuesta, cantidad]) => ({
        respuesta,
        cantidad,
        porcentaje: total ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      id: campo,
      numero: index + 1,
      dimension: DIMENSIONES_PREGUNTAS[index],
      pregunta: ENCABEZADOS_ESPERADOS[index],
      total,
      respuestas,
    };
  });

  const preguntasFiltradas = dimension
    ? preguntas.filter((pregunta) => pregunta.dimension === dimension)
    : preguntas;

  return { periodo, total: filasPeriodo.length, preguntas: preguntasFiltradas };
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

function puntajeOrdinal(valor, opciones) {
  if (valor === null || valor === undefined || !opciones?.length) return null;
  const indice = opciones.indexOf(valor);
  return indice < 0 ? null : (indice / Math.max(opciones.length - 1, 1)) * 100;
}

function puntajeDimension(respuestas, campos) {
  const valores = campos.map(([campo, opciones]) => puntajeOrdinal(respuestas[campo], opciones));
  return Number(promedio(valores).toFixed(2));
}

function medirEntrevista(respuestas) {
  const opciones = (nombre) => OPCIONES[nombre];
  return {
    conocimiento: puntajeDimension(respuestas, [
      ['q01ContributesFinancially', opciones('siNo')], ['q04EducationLevel', opciones('educacion')],
      ['q05InsurancePurpose', opciones('q05')], ['q06MandatoryInsuranceActivity', opciones('q06')],
      ['q07MeaningPolicyholder', opciones('q07')], ['q08MeaningClaim', opciones('q08')],
      ['q09MeaningPremium', opciones('q09')], ['q10MeaningDeductible', opciones('q10')],
      ['q11MeaningExclusions', opciones('q11')], ['q12WhoSellsInsurance', opciones('q12')],
      ['q13WhoIsHarmedByFraud', opciones('q13')], ['q14WhereToFileClaim', opciones('q14')],
    ]),
    uso: puntajeDimension(respuestas, [
      ['q18HowToProtectYourself', opciones('q18')], ['q19AnnualInsuranceSpend', opciones('q19')],
      ['q22HasLifeInsurance', opciones('siNo')], ['q23LifeInsuranceDuration', opciones('q23')],
      ['q28LikelihoodFuturePurchase', opciones('q28')],
    ]),
    educacion: puntajeDimension(respuestas, [
      ['q15HowAcquiredKnowledge', opciones('q15')], ['q16BestMethodToImprove', opciones('q16')],
      ['q17WhoImprovesEducation', opciones('q17')],
    ]),
    prevision: puntajeDimension(respuestas, [
      ['q20RetirementPreparation', opciones('q20')], ['q21InsuranceCultureLevel', opciones('q21')],
      ['q24ReasonAcquired', opciones('q24')], ['q25PolicyReviewFrequency', opciones('q25')],
      ['q26WouldSwitchProvider', opciones('q26')], ['q27SatisfactionCurrentPolicy', opciones('q27')],
      ['q29BarriersToPurchase', opciones('q29')], ['q30TrustInInsurers', opciones('q30')],
      ['q31IncomePercentageWilling', opciones('q31')], ['q32MostImportantFactor', opciones('q32')],
    ]),
  };
}

async function registrarEntrevistaIndividual({ communityId, year, quarter, userId, campusId, ...respuestas }) {
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
    const columnas = CAMPOS_ENCUESTA.map(([, columna]) => columna);
    const valores = CAMPOS_ENCUESTA.map(([campo]) => respuestas[campo] ?? null);
    const [respuesta] = await conexion.query(
      `INSERT INTO ica_survey_response
         (data_load_id, community_id, year, quarter, surveyor_user_id, ${columnas.join(', ')}, status)
       VALUES (?, ?, ?, ?, ?, ${columnas.map(() => '?').join(', ')}, 1)`,
      [carga.insertId, communityId, year, quarter, userId, ...valores],
    );
    const medicion = medirEntrevista(respuestas);
    const hombres = respuestas.q03Sex === 'Hombre' ? 100 : 0;
    const mujeres = respuestas.q03Sex === 'Mujer' ? 100 : 0;
    await conexion.query(
      `INSERT INTO ica_measurement
       (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [communityId, carga.insertId, year, quarter, medicion.conocimiento, medicion.uso, medicion.educacion, medicion.prevision, hombres, mujeres],
    );
    await conexion.commit();
    return { dataLoadId: carga.insertId, surveyResponseId: respuesta.insertId };
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

async function obtenerArchivoParaDescarga({ campusId, dataLoadId }) {
  const [filas] = await pool.query(
    `SELECT dl.data_load_id, dl.file_name
       FROM data_load dl
       INNER JOIN ica_survey_response sr
         ON sr.data_load_id = dl.data_load_id
        AND sr.status = 1
       INNER JOIN community c
         ON c.community_id = sr.community_id
      WHERE dl.data_load_id = ?
        AND dl.module = ?
        AND dl.source_type = ?
        AND dl.status != 0
        AND c.campus_id = ?
      LIMIT 1`,
    [
      dataLoadId,
      MODULE_ICA,
      SOURCE_TYPE_ARCHIVO,
      campusId,
    ],
  );

  if (!filas.length) {
    throw new Error('ARCHIVO_NO_ENCONTRADO');
  }

  const archivo = filas[0];

  const ruta = rutaArchivo(
    archivo.data_load_id,
    archivo.file_name
  );

  if (!fs.existsSync(ruta)) {
    throw new Error('ARCHIVO_NO_DISPONIBLE');
  }

  return {
    ruta,
    nombreArchivo: archivo.file_name,
  };
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

const COLUMNAS_ORDEN = {
  comuna: ['comuna_nombre'],
  periodo: ['year', 'quarter'],
  fecha: ['dl.created_at'],
};

async function obtenerHistorialIca({ campusId, page = 1, pageSize = 10, tipo, communityId, busqueda, estado, sortBy, sortDir }) {
  const offset = (page - 1) * pageSize;

  const condiciones = ['dl.module = ?', 'dl.status != 0', 'c.campus_id = ?'];
  const parametros = [MODULE_ICA, campusId];

  if (tipo === 'individuales') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_INDIVIDUAL);
  } else if (tipo === 'archivos') {
    condiciones.push('dl.source_type = ?');
    parametros.push(SOURCE_TYPE_ARCHIVO);
  }

  if (communityId) {
    condiciones.push('sr.community_id = ?');
    parametros.push(communityId);
  }

  if (busqueda) {
    condiciones.push('(dl.file_name LIKE ? OR c.community_name LIKE ?)');
    parametros.push(`%${busqueda}%`, `%${busqueda}%`);
  }
  if (estado === 'verificado') {
  condiciones.push('dl.status = ?');
  parametros.push(2);
} else if (estado === 'no_verificado') {
  condiciones.push('dl.status = ?');
  parametros.push(1);
}

  const whereSql = condiciones.join(' AND ');
  const columnasOrden = COLUMNAS_ORDEN[sortBy] || COLUMNAS_ORDEN.fecha;
const direccion = sortDir === 'asc' ? 'ASC' : 'DESC';
const orderSql = columnasOrden.map((col) => `${col} ${direccion}`).join(', ');

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM (
       SELECT dl.data_load_id
         FROM data_load dl
         INNER JOIN ica_survey_response sr ON sr.data_load_id = dl.data_load_id AND sr.status = 1
         INNER JOIN community c ON c.community_id = sr.community_id
        WHERE ${whereSql}
        GROUP BY dl.data_load_id
     ) sub`,
    parametros,
  );

  const [filas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at,
            MIN(c.community_name) AS comuna_nombre,
            COUNT(DISTINCT sr.community_id) AS num_comunidades,
            MIN(sr.year) AS year, MIN(sr.quarter) AS quarter,
            COUNT(DISTINCT CONCAT(sr.year, '-', sr.quarter)) AS num_periodos,
            COUNT(sr.survey_response_id) AS total_registros
       FROM data_load dl
       INNER JOIN ica_survey_response sr ON sr.data_load_id = dl.data_load_id AND sr.status = 1
       INNER JOIN community c ON c.community_id = sr.community_id
      WHERE ${whereSql}
      GROUP BY dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?`,
    [...parametros, pageSize, offset],
  );

  const registros = filas.map((fila) => ({
    id: fila.data_load_id,
    tipo: Number(fila.source_type) === SOURCE_TYPE_ARCHIVO ? 'masiva' : 'manual',
    origen: Number(fila.source_type) === SOURCE_TYPE_ARCHIVO ? fila.file_name : 'Registro individual',
    comuna: Number(fila.num_comunidades) === 1 ? fila.comuna_nombre : `${fila.num_comunidades} comunas`,
    periodo: Number(fila.num_periodos) === 1 ? `Q${fila.quarter} ${fila.year}` : 'Varios períodos',
    registros: Number(fila.total_registros),
    fecha: fila.created_at,
    estado: Number(fila.status) === 2 ? 'Verificado' : 'No verificado',
  }));

  return { registros, total, page, pageSize };
}
//Eliminar registro individual(0) y cambio de estado de carga individual a eliminado (0) 
async function eliminarRegistroIndividual({ campusId, dataLoadId }) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [cargas] = await conexion.query(
      `SELECT dl.data_load_id
         FROM data_load dl
        WHERE dl.data_load_id = ?
          AND dl.module = ?
          AND dl.source_type = ?
          AND dl.status != 0`,
      [dataLoadId, MODULE_ICA, SOURCE_TYPE_INDIVIDUAL],
    );
    if (!cargas.length) throw new Error('REGISTRO_NO_ENCONTRADO');

    const [pertenencia] = await conexion.query(
      `SELECT 1 FROM ica_survey_response sr
         INNER JOIN community c ON c.community_id = sr.community_id
        WHERE sr.data_load_id = ? AND sr.status = 1 AND c.campus_id = ?
        LIMIT 1`,
      [dataLoadId, campusId],
    );
    if (!pertenencia.length) throw new Error('REGISTRO_NO_ENCONTRADO');

    await conexion.query(
      'UPDATE ica_survey_response SET status = 0 WHERE data_load_id = ? AND status = 1',
      [dataLoadId],
    );
    await conexion.query('UPDATE data_load SET status = 0 WHERE data_load_id = ?', [dataLoadId]);

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}
// Eliminar archivo (0) y cambio de estado de carga masiva a eliminado (0)
async function eliminarArchivoIca({ campusId, dataLoadId }) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [cargas] = await conexion.query(
      `SELECT dl.data_load_id
         FROM data_load dl
        WHERE dl.data_load_id = ?
          AND dl.module = ?
          AND dl.source_type = ?
          AND dl.status != 0`,
      [
        dataLoadId,
        MODULE_ICA,
        SOURCE_TYPE_ARCHIVO,
      ],
    );

    if (!cargas.length) {
      throw new Error('ARCHIVO_NO_ENCONTRADO');
    }

    const [pertenencia] = await conexion.query(
      `SELECT 1
         FROM ica_survey_response sr
         INNER JOIN community c
           ON c.community_id = sr.community_id
        WHERE sr.data_load_id = ?
          AND sr.status = 1
          AND c.campus_id = ?
        LIMIT 1`,
      [dataLoadId, campusId],
    );

    if (!pertenencia.length) {
      throw new Error('ARCHIVO_NO_ENCONTRADO');
    }

    // Eliminar lógicamente todas las respuestas del archivo
    await conexion.query(
      `UPDATE ica_survey_response
          SET status = 0
        WHERE data_load_id = ?
          AND status = 1`,
      [dataLoadId],
    );

    // Eliminar lógicamente el archivo
    await conexion.query(
      `UPDATE data_load
          SET status = 0
        WHERE data_load_id = ?`,
      [dataLoadId],
    );

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}
// Eliminar respuesta individual (0) y actualización de total_rows del archivo
async function eliminarRespuestaIca({ campusId, surveyResponseId }) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [respuestas] = await conexion.query(
      `SELECT sr.survey_response_id,
              sr.data_load_id
         FROM ica_survey_response sr
         INNER JOIN data_load dl
           ON dl.data_load_id = sr.data_load_id
         INNER JOIN community c
           ON c.community_id = sr.community_id
        WHERE sr.survey_response_id = ?
          AND sr.status = 1
          AND dl.module = ?
          AND dl.source_type = ?
          AND dl.status != 0
          AND c.campus_id = ?
        LIMIT 1`,
      [
        surveyResponseId,
        MODULE_ICA,
        SOURCE_TYPE_ARCHIVO,
        campusId,
      ],
    );

    if (!respuestas.length) {
      throw new Error('RESPUESTA_NO_ENCONTRADA');
    }

    const dataLoadId = respuestas[0].data_load_id;

    // Eliminar solamente esta entrevista
    await conexion.query(
      `UPDATE ica_survey_response
          SET status = 0
        WHERE survey_response_id = ?`,
      [surveyResponseId],
    );

    // Actualizar cantidad de registros activos del archivo
    await conexion.query(
      `UPDATE data_load
          SET total_rows = (
            SELECT COUNT(*)
              FROM ica_survey_response
             WHERE data_load_id = ?
               AND status = 1
          )
        WHERE data_load_id = ?`,
      [dataLoadId, dataLoadId],
    );

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}
//Cambia el estado de una entrevista a verificado (2) cuando un superadmin lo aprueba. Esto no recalcula el agregado, solo cambia el estado de la carga.
async function verificarCargaIca({ campusId, dataLoadId }) {
  const [cargas] = await pool.query(
    `SELECT dl.data_load_id
       FROM data_load dl
       INNER JOIN ica_survey_response sr
         ON sr.data_load_id = dl.data_load_id
        AND sr.status = 1
       INNER JOIN community c
         ON c.community_id = sr.community_id
      WHERE dl.data_load_id = ?
        AND dl.module = ?
        AND dl.status = 1
        AND c.campus_id = ?
      LIMIT 1`,
    [dataLoadId, MODULE_ICA, campusId],
  );

  if (!cargas.length) {
    throw new Error('ARCHIVO_NO_ENCONTRADO');
  }

  await pool.query(
    `UPDATE data_load
        SET status = 2
      WHERE data_load_id = ?
        AND status = 1`,
    [dataLoadId],
  );
}

async function obtenerDetalleArchivoIca({ campusId, dataLoadId }) {
  const [cargas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at,
            u.first_name, u.paternal_last_name
       FROM data_load dl
       LEFT JOIN user u ON u.user_id = dl.created_modified_by
      WHERE dl.data_load_id = ? AND dl.module = ? AND dl.status != 0`,
    [dataLoadId, MODULE_ICA],
  );
  if (!cargas.length) throw new Error('ARCHIVO_NO_ENCONTRADO');
  const carga = cargas[0];

  const columnas = CAMPOS_ENCUESTA.map(([, col]) => col);
  const [respuestas] = await pool.query(
    `SELECT sr.survey_response_id, sr.community_id, c.community_name, c.campus_id, sr.year, sr.quarter,
            ${columnas.join(', ')}
       FROM ica_survey_response sr
       INNER JOIN community c ON c.community_id = sr.community_id
      WHERE sr.data_load_id = ? AND sr.status = 1`,
    [dataLoadId],
  );

  // El archivo es de UNA sola comuna, así que si no hay filas, o la comuna
  // no pertenece a la sede del usuario, no existe para él.
  if (!respuestas.length || respuestas[0].campus_id !== campusId) {
    throw new Error('ARCHIVO_NO_ENCONTRADO');
  }

  const registros = respuestas.map((fila) => {
    const objeto = { id: fila.survey_response_id };
    CAMPOS_ENCUESTA.forEach(([campoJs, col]) => {
      objeto[campoJs] = fila[col];
    });
    return objeto;
  });

  const nombreUsuario = [carga.first_name, carga.paternal_last_name].filter(Boolean).join(' ') || 'Usuario del sistema';

  return {
    archivo: {
      id: carga.data_load_id,
      nombre: carga.file_name,
      tipoCarga: Number(carga.source_type),
      fechaCarga: carga.created_at,
      subidoPor: nombreUsuario,
      totalRegistros: respuestas.length,
      estado: Number(carga.status) === 2 ? 'Verificado' : 'No verificado',
      comunidad: respuestas[0].community_name,
      periodo: `Q${respuestas[0].quarter} ${respuestas[0].year}`,
    },
    registros,
  };
}
module.exports = {
  parsearArchivoIca,
  validarFilas,
  registrarCargaPorArchivo,
  obtenerComunidadesPorSede,
  obtenerDashboard,
  obtenerExploradorPreguntas,
  registrarRegistroIndividual,
  registrarEntrevistaIndividual,
  obtenerHistorialIca,
  eliminarRegistroIndividual,
  eliminarArchivoIca,
  eliminarRespuestaIca,
  obtenerDetalleArchivoIca,
  verificarCargaIca,
  obtenerArchivoParaDescarga,
};