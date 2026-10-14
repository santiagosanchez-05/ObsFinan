const xlsx = require('xlsx');
const pool = require('../../config/db');
const { ESTADO_CARGA } = require('../../config/estados');
const { ENCABEZADOS_ESPERADOS, OPCIONES } = require('./ica.validation');
const { puntuarEncuesta, icaPonderado } = require('./ica.puntajes');
const { periodoDelEventoAsignado } = require('../events/events.encuesta.service');

// module: 1=ICA, 2=SPE; source_type: 1=individual (la carga por archivo se quitó: todo es individual)
const MODULE_ICA = 1;
const SOURCE_TYPE_INDIVIDUAL = 1;

// data_load.status: 0 = eliminado, 1 = pendiente de verificación, 2 = verificado.
// Lo que carga un Admin/Superadmin entra ya verificado — no tiene sentido que
// quede esperando revisión de alguien de su mismo nivel. El estado 1 queda para
// las encuestas que en Sprint 2 manden los encuestadores (pendientes de aprobación).
const ESTADO_CARGA_PENDIENTE = 1;
const ESTADO_CARGA_VERIFICADA = 2;

function estadoInicialCarga(rol) {
  return rol === 'admin' || rol === 'superadmin' ? ESTADO_CARGA_VERIFICADA : ESTADO_CARGA_PENDIENTE;
}

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


// campusId null = Superadmin: comunas de todas las sedes (US65).
async function obtenerComunidadesPorSede(campusId) {
  const [comunidades] = await pool.query(
    `SELECT co.community_id, co.community_name, co.campus_id, ca.campus_name
       FROM community co
       INNER JOIN campus ca ON ca.campus_id = co.campus_id
      WHERE co.status = 1${campusId ? ' AND co.campus_id = ?' : ''}
      ORDER BY ca.campus_name, co.community_name`,
    campusId ? [campusId] : [],
  );
  return comunidades;
}


function promedio(valores) {
  const validos = valores.filter((valor) => valor !== null && valor !== undefined);
  return validos.length ? validos.reduce((total, valor) => total + Number(valor), 0) / validos.length : null;
}

function transformarMedicion(row, genero = null) {
  // ICA general = promedio PONDERADO de las dimensiones (pesos en ica.puntajes.js).
  const general = icaPonderado({ conocimiento: row.conocimiento, uso: row.uso, educacion: row.educacion, prevision: row.prevision });
  const valorPorGenero = genero === 'hombres' ? Number(row.ica_hombres) : Number(row.ica_mujeres);
  const valor = genero ? (valorPorGenero > 0 ? valorPorGenero : null) : general === null ? null : Number(general.toFixed(1));
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
    valor,
  };
}

function consolidarMedicionesPorComunidad(filas) {
  const porComunidad = new Map();

  filas.forEach((fila) => {
    const actual = porComunidad.get(fila.community_id) || {
      ica_measurement_id: fila.ica_measurement_id,
      community_id: fila.community_id,
      community_name: fila.community_name,
      conocimiento: [],
      uso: [],
      educacion: [],
      prevision: [],
      ica_hombres: [],
      ica_mujeres: [],
    };

    ['conocimiento', 'uso', 'educacion', 'prevision', 'ica_hombres', 'ica_mujeres']
      .forEach((campo) => actual[campo].push(Number(fila[campo])));
    porComunidad.set(fila.community_id, actual);
  });

  return [...porComunidad.values()].map((fila) => ({
    ...fila,
    conocimiento: promedio(fila.conocimiento),
    uso: promedio(fila.uso),
    educacion: promedio(fila.educacion),
    prevision: promedio(fila.prevision),
    ica_hombres: promedio(fila.ica_hombres),
    ica_mujeres: promedio(fila.ica_mujeres),
    year: null,
    quarter: null,
  }));
}

// ---------------------------------------------------------------------
// Usada por getDashboardIca,
// ---------------------------------------------------------------------
async function obtenerDashboard({ campusId, mostrarTodasSedes = false, year, quarter, communityId, dimension, genero }) {
  const condiciones = ['c.status = 1', 'm.status = 1'];
  const parametros = [];

  if (campusId) {
    condiciones.unshift('c.campus_id = ?');
    parametros.unshift(campusId);
  }

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
      WHERE c.status = 1
        AND m.status = 1
        ${campusId ? 'AND c.campus_id = ?' : ''}
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    campusId ? [campusId] : [],
  );

  const [sedes] = await pool.query(
    `SELECT campus_id, campus_name
       FROM campus
      WHERE status = 1
        ${!mostrarTodasSedes && campusId ? 'AND campus_id = ?' : ''}
      ORDER BY campus_name ASC`,
    !mostrarTodasSedes && campusId ? [campusId] : [],
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
        generos: ['hombres', 'mujeres'],
        sedes: sedes.map((sede) => ({ campusId: Number(sede.campus_id), nombre: sede.campus_name })),
      },
    };
  }

  // ------------------------------------------------------------
  // PERÍODO DEL DASHBOARD
  // ------------------------------------------------------------

  const todosLosPeriodos = !year && !quarter;
  const periodo = todosLosPeriodos
    ? { year: null, quarter: null, todos: true }
    : {
      year: Number(filas[0].year),
      quarter: Number(filas[0].quarter),
    };

  const filasPeriodo = todosLosPeriodos
    ? consolidarMedicionesPorComunidad(filas)
    : filas.filter(
      (fila) =>
        Number(fila.year) === periodo.year &&
        Number(fila.quarter) === periodo.quarter,
    );

  const comunas = filasPeriodo
    .map((fila) => transformarMedicion(fila, genero))
    .filter((fila) => fila.valor !== null);

  if (!comunas.length) {
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
        generos: ['hombres', 'mujeres'],
        sedes: sedes.map((sede) => ({ campusId: Number(sede.campus_id), nombre: sede.campus_name })),
      },
    };
  }

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
      generos: ['hombres', 'mujeres'],
      sedes: sedes.map((sede) => ({ campusId: Number(sede.campus_id), nombre: sede.campus_name })),
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
  const condiciones = ['c.status = 1', 'sr.status = 1'];
  const parametros = [];

  if (campusId) {
    condiciones.unshift('c.campus_id = ?');
    parametros.unshift(campusId);
  }

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
     INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
                            AND dl.status = ${ESTADO_CARGA.APROBADA}
    WHERE ${condiciones.join(' AND ')}
    ORDER BY sr.year DESC, sr.quarter DESC`,
  parametros,
);

  let filasPeriodo = filas;
  let periodo = null;
  if (filas.length) {
    if (!year && !quarter) {
      periodo = { year: null, quarter: null, todos: true };
    } else {
      periodo = { year: Number(filas[0].year), quarter: Number(filas[0].quarter) };
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

async function registrarRegistroIndividual({ communityId, year, quarter, conocimiento, uso, educacion, prevision, icaHombres, icaMujeres, userId, campusId, rol }) {
  const [comunidades] = await pool.query(
    `SELECT community_id FROM community WHERE community_id = ? AND status = 1${campusId ? ' AND campus_id = ?' : ''}`,
    campusId ? [communityId, campusId] : [communityId],
  );
  if (!comunidades.length) throw new Error('COMUNIDAD_NO_ENCONTRADA');

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [MODULE_ICA, SOURCE_TYPE_INDIVIDUAL, 'Registro individual', estadoInicialCarga(rol), userId],
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

// Puntaje de una entrevista con la metodología del ICA (ica.puntajes.js):
// 4 dimensiones de 0 a 100 + ICA ponderado (25/15/20/40).
function medirEntrevista(respuestas) {
  return puntuarEncuesta(respuestas);
}

function filaSqlARespuestas(filaSql) {
  const objeto = {};
  CAMPOS_ENCUESTA.forEach(([campoJs, col]) => {
    objeto[campoJs] = filaSql[col];
  });
  return objeto;
}

// ICA promedio de un grupo de entrevistas (se usa para hombres / mujeres).
// null si el grupo está vacío (no hay entrevistas de ese sexo en el período).
function promedioGeneralGrupo(filasGrupo) {
  if (!filasGrupo.length) return null;
  const icas = filasGrupo.map((fila) => medirEntrevista(filaSqlARespuestas(fila)).ica);
  const valor = promedio(icas);
  return valor === null ? null : Number(valor.toFixed(2));
}

const dosDecimales = (valor) => (valor === null ? null : Number(valor.toFixed(2)));

// Recalcula el agregado de ica_measurement para una comuna+período, tomando
// TODAS las entrevistas APROBADAS de ica_survey_response de esa combinación
// (no solo la que se acaba de insertar). Esto es lo que evita el error de
// uq_measurement_period: en vez de insertar una fila nueva por entrevista,
// se actualiza siempre la misma fila con el promedio acumulado.
async function recalcularAgregadoManual({ conexion, communityId, year, quarter, dataLoadId }) {
  const [filas] = await conexion.query(
    `SELECT sr.*
       FROM ica_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE sr.community_id = ?
        AND sr.year = ?
        AND sr.quarter = ?
        AND sr.status = 1
        AND dl.status = ?`,
    [communityId, year, quarter, ESTADO_CARGA.APROBADA],
  );

  // Sin encuestas aprobadas (por ejemplo, después de dar de baja la última):
  // la fila del agregado deja de contar.
  if (!filas.length) {
    await conexion.query(
      'UPDATE ica_measurement SET status = 0 WHERE community_id = ? AND year = ? AND quarter = ?',
      [communityId, year, quarter],
    );
    return;
  }

  const mediciones = filas.map((fila) => medirEntrevista(filaSqlARespuestas(fila)));
  const knowledgeIndex = dosDecimales(promedio(mediciones.map((m) => m.conocimiento)));
  const usageIndex = dosDecimales(promedio(mediciones.map((m) => m.uso)));
  const educationIndex = dosDecimales(promedio(mediciones.map((m) => m.educacion)));
  const foresightIndex = dosDecimales(promedio(mediciones.map((m) => m.prevision)));

  // NULL = todavía no hay entrevistas de ese sexo en este período.
  const icaMale = promedioGeneralGrupo(filas.filter((f) => f.q03_sex === 'Hombre'));
  const icaFemale = promedioGeneralGrupo(filas.filter((f) => f.q03_sex === 'Mujer'));

  await conexion.query(
    `INSERT INTO ica_measurement
       (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       data_load_id = VALUES(data_load_id),
       knowledge_index = VALUES(knowledge_index),
       usage_index = VALUES(usage_index),
       education_index = VALUES(education_index),
       foresight_index = VALUES(foresight_index),
       ica_male = VALUES(ica_male),
       ica_female = VALUES(ica_female),
       status = 1`,
    [communityId, dataLoadId, year, quarter, knowledgeIndex, usageIndex, educationIndex, foresightIndex, icaMale, icaFemale],
  );
}
async function registrarEntrevistaIndividual({ communityId, year, quarter, eventId, userId, campusId, rol, ...respuestas }) {
  const [comunidades] = await pool.query(
    `SELECT community_id FROM community WHERE community_id = ? AND status = 1${campusId ? ' AND campus_id = ?' : ''}`,
    campusId ? [communityId, campusId] : [communityId],
  );
  if (!comunidades.length) throw new Error('COMUNIDAD_NO_ENCONTRADA');

  // El encuestador carga desde "Mis eventos": el evento tiene que estar
  // asignado y habilitar ICA, y el período sale de la fecha del evento.
  if (rol === 'encuestador') {
    ({ year, quarter } = await periodoDelEventoAsignado({ eventId, userId, encuesta: 'ica' }));
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [MODULE_ICA, SOURCE_TYPE_INDIVIDUAL, 'Registro individual', estadoInicialCarga(rol), userId],
    );
    const columnas = CAMPOS_ENCUESTA.map(([, columna]) => columna);
    const valores = CAMPOS_ENCUESTA.map(([campo]) => respuestas[campo] ?? null);
    const [respuesta] = await conexion.query(
      `INSERT INTO ica_survey_response
         (data_load_id, community_id, year, quarter, surveyor_user_id, event_id, ${columnas.join(', ')}, status)
       VALUES (?, ?, ?, ?, ?, ?, ${columnas.map(() => '?').join(', ')}, 1)`,
      [carga.insertId, communityId, year, quarter, userId, eventId ?? null, ...valores],
    );
    if (estadoInicialCarga(rol) === ESTADO_CARGA.APROBADA) {
      await recalcularAgregadoManual({
        conexion, communityId, year, quarter, dataLoadId: carga.insertId,
      });
    }
    await conexion.commit();
    return { dataLoadId: carga.insertId, surveyResponseId: respuesta.insertId, periodo: { year, quarter } };
  } catch (err) {
    await conexion.rollback();
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

// Todos los registros son individuales (la carga por archivo se quitó).
async function obtenerHistorialIca({ campusId, page = 1, pageSize = 10, communityId, busqueda, estado, sortBy, sortDir }) {
  const offset = (page - 1) * pageSize;

  const condiciones = ['dl.module = ?', 'dl.status != 0', 'dl.source_type = ?'];
  const parametros = [MODULE_ICA, SOURCE_TYPE_INDIVIDUAL];
  if (campusId) {
    condiciones.push('c.campus_id = ?');
    parametros.push(campusId);
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
  parametros.push(ESTADO_CARGA.APROBADA);
} else if (estado === 'no_verificado') {
  condiciones.push('dl.status = ?');
  parametros.push(ESTADO_CARGA.PENDIENTE);
} else if (estado === 'rechazado') {
  condiciones.push('dl.status = ?');
  parametros.push(ESTADO_CARGA.RECHAZADA);
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
    tipo: 'manual',
    origen: 'Registro individual',
    comuna: Number(fila.num_comunidades) === 1 ? fila.comuna_nombre : `${fila.num_comunidades} comunas`,
    periodo: Number(fila.num_periodos) === 1 ? `Q${fila.quarter} ${fila.year}` : 'Varios períodos',
    registros: Number(fila.total_registros),
    fecha: fila.created_at,
    estado: Number(fila.status) === ESTADO_CARGA.APROBADA
  ? 'Verificado'
  : Number(fila.status) === ESTADO_CARGA.RECHAZADA
    ? 'Rechazado'
    : 'Pendiente',
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
      `SELECT sr.community_id, sr.year, sr.quarter FROM ica_survey_response sr
         INNER JOIN community c ON c.community_id = sr.community_id
        WHERE sr.data_load_id = ? AND sr.status = 1${campusId ? ' AND c.campus_id = ?' : ''}
        LIMIT 1`,
      campusId ? [dataLoadId, campusId] : [dataLoadId],
    );
    if (!pertenencia.length) throw new Error('REGISTRO_NO_ENCONTRADO');

    await conexion.query(
      'UPDATE ica_survey_response SET status = 0 WHERE data_load_id = ? AND status = 1',
      [dataLoadId],
    );
    await conexion.query('UPDATE data_load SET status = 0 WHERE data_load_id = ?', [dataLoadId]);

    // Si la encuesta estaba aprobada, ya contaba en el dashboard: se recalcula
    // el agregado de su comuna y trimestre sin ella.
    const { community_id: communityId, year, quarter } = pertenencia[0];
    await recalcularAgregadoManual({ conexion, communityId, year, quarter, dataLoadId });

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
    `SELECT dl.data_load_id, sr.community_id, sr.year, sr.quarter
       FROM data_load dl
       INNER JOIN ica_survey_response sr
         ON sr.data_load_id = dl.data_load_id
        AND sr.status = 1
       INNER JOIN community c
         ON c.community_id = sr.community_id
      WHERE dl.data_load_id = ?
        AND dl.module = ?
        AND dl.status = 1
        ${campusId ? 'AND c.campus_id = ?' : ''}
      LIMIT 1`,
    campusId ? [dataLoadId, MODULE_ICA, campusId] : [dataLoadId, MODULE_ICA],
  );

  if (!cargas.length) {
    throw new Error('ARCHIVO_NO_ENCONTRADO');
  }
  const { community_id: communityId, year, quarter } = cargas[0];

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    await conexion.query(
      `UPDATE data_load SET status = 2 WHERE data_load_id = ? AND status = 1`,
      [dataLoadId],
    );

    // El cálculo real (recibiendo la tabla de puntos oficial) reemplaza a
    // recalcularAgregadoManual cuando el cliente confirme el scoring.
    await recalcularAgregadoManual({ conexion, communityId, year, quarter, dataLoadId });

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

// Detalle de UN registro individual (la carga por archivo se quitó).
async function obtenerDetalleRegistroIca({ campusId, dataLoadId }) {
  const [cargas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.status, dl.created_at,
            u.first_name, u.paternal_last_name
       FROM data_load dl
       LEFT JOIN user u ON u.user_id = dl.created_modified_by
      WHERE dl.data_load_id = ? AND dl.module = ? AND dl.source_type = ? AND dl.status != 0`,
    [dataLoadId, MODULE_ICA, SOURCE_TYPE_INDIVIDUAL],
  );
  if (!cargas.length) throw new Error('REGISTRO_NO_ENCONTRADO');
  const carga = cargas[0];

  const columnas = CAMPOS_ENCUESTA.map(([, col]) => col);
 const [respuestas] = await pool.query(
  `SELECT sr.survey_response_id, sr.community_id, c.community_name, c.campus_id, sr.year, sr.quarter,
          sr.event_id, e.title AS event_title, e.event_date,
          ${columnas.join(', ')}
     FROM ica_survey_response sr
     INNER JOIN community c ON c.community_id = sr.community_id
     LEFT JOIN event e ON e.event_id = sr.event_id
    WHERE sr.data_load_id = ? AND sr.status = 1`,
  [dataLoadId],
);

  // Si no hay respuesta, o la comuna no es de la sede del usuario, no existe
  // para él (el Superadmin, con campusId null, ve todas las sedes).
  if (!respuestas.length || (campusId && respuestas[0].campus_id !== campusId)) {
    throw new Error('REGISTRO_NO_ENCONTRADO');
  }

  const registros = respuestas.map((fila) => {
    const objeto = { id: fila.survey_response_id };
    CAMPOS_ENCUESTA.forEach(([campoJs, col]) => {
      objeto[campoJs] = fila[col];
    });
    return objeto;
  });

  const nombreUsuario = [carga.first_name, carga.paternal_last_name].filter(Boolean).join(' ') || 'Usuario del sistema';
  // Puntaje de ESTA encuesta con la metodología del ICA.
  const puntaje = medirEntrevista(registros[0]);
    return {
    archivo: {
      id: carga.data_load_id,
      nombre: carga.file_name,
      tipoCarga: Number(carga.source_type),
      fechaCarga: carga.created_at,
      subidoPor: nombreUsuario,
      totalRegistros: respuestas.length,
      estado: Number(carga.status) === ESTADO_CARGA.APROBADA
        ? 'Verificado'
        : Number(carga.status) === ESTADO_CARGA.RECHAZADA
          ? 'Rechazado'
          : 'Pendiente',
      comunidad: respuestas[0].community_name,
      periodo: `Q${respuestas[0].quarter} ${respuestas[0].year}`,
      evento: respuestas[0].event_id
        ? {
            id: respuestas[0].event_id,
            nombre: respuestas[0].event_title || `Evento #${respuestas[0].event_id}`,
            fecha: respuestas[0].event_date || null,
          }
        : null,
    },
    registros,
    puntaje,
  };
}

// Quita acentos y caracteres raros para que el nombre de archivo sea seguro
// en cualquier sistema operativo.
function normalizarNombreArchivo(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Trae los datos crudos de una entrevista manual (comuna, período, 32 respuestas)
// y arma el nombre base del archivo. Común a ambos formatos de descarga.
async function obtenerDatosRegistroIndividual({ campusId, dataLoadId }) {
  const [cargas] = await pool.query(
    `SELECT dl.data_load_id, dl.file_name, dl.created_at
       FROM data_load dl
      WHERE dl.data_load_id = ? AND dl.module = ? AND dl.source_type = ? AND dl.status != 0`,
    [dataLoadId, MODULE_ICA, SOURCE_TYPE_INDIVIDUAL],
  );
  if (!cargas.length) throw new Error('REGISTRO_NO_ENCONTRADO');
  const carga = cargas[0];

  const columnas = CAMPOS_ENCUESTA.map(([, col]) => col);
  const [respuestas] = await pool.query(
    `SELECT sr.survey_response_id, c.community_name, c.campus_id, sr.year, sr.quarter, ${columnas.join(', ')}
       FROM ica_survey_response sr
       INNER JOIN community c ON c.community_id = sr.community_id
      WHERE sr.data_load_id = ? AND sr.status = 1
      LIMIT 1`,
    [dataLoadId],
  );
  if (!respuestas.length || (campusId && respuestas[0].campus_id !== campusId)) {
    throw new Error('REGISTRO_NO_ENCONTRADO');
  }
  const fila = respuestas[0];

  const fechaTexto = new Date(carga.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
  const nombreBase = `${normalizarNombreArchivo(carga.file_name)}_${normalizarNombreArchivo(fila.community_name)}_${fechaTexto}`;

  return { carga, fila, nombreBase };
}

// Genera la descarga de UNA entrevista manual, en Excel o JSON. Acá no hay
// archivo físico guardado en disco (se tipeó en la interfaz), así que en
// ambos casos se construye al vuelo a partir de ica_survey_response.
async function generarDescargaRegistroIndividual({ campusId, dataLoadId, formato = 'xlsx' }) {
  const { fila, nombreBase } = await obtenerDatosRegistroIndividual({ campusId, dataLoadId });

  if (formato === 'json') {
    const respuestas = CAMPOS_ENCUESTA.map(([, col], index) => ({
      pregunta: ENCABEZADOS_ESPERADOS[index],
      respuesta: fila[col] ?? null,
    }));
    const contenido = JSON.stringify(
      { comuna: fila.community_name, year: fila.year, quarter: fila.quarter, respuestas },
      null,
      2,
    );
    return { contenido, nombreArchivo: `${nombreBase}.json`, mimeType: 'application/json' };
  }

  // Fila 1: el texto exacto de cada pregunta (igual que el Excel de carga masiva).
  // Fila 2: las 32 respuestas de esta entrevista.
  const valores = CAMPOS_ENCUESTA.map(([, col]) => fila[col] ?? '');
  const hoja = xlsx.utils.aoa_to_sheet([ENCABEZADOS_ESPERADOS, valores]);
  const libro = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(libro, hoja, 'Respuestas');
  const contenido = xlsx.write(libro, { type: 'buffer', bookType: 'xlsx' });

  return {
    contenido,
    nombreArchivo: `${nombreBase}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
// Exporta TODAS las encuestas verificadas (estado 2)
async function obtenerRespuestasIcaExport({ campusId, year, quarter, communityId }) {
  const condiciones = ['c.status = 1', 'sr.status = 1', 'dl.status = 2'];
  const parametros = [];
  if (campusId) {
    condiciones.unshift('c.campus_id = ?');
    parametros.unshift(campusId);
  }

  if (year) { condiciones.push('sr.year = ?'); parametros.push(year); }
  if (quarter) { condiciones.push('sr.quarter = ?'); parametros.push(quarter); }
  if (communityId) { condiciones.push('sr.community_id = ?'); parametros.push(communityId); }

  const columnas = CAMPOS_ENCUESTA.map(([, col]) => col);
  const [filas] = await pool.query(
    `SELECT sr.survey_response_id, c.community_name AS comuna, sr.year, sr.quarter, ${columnas.join(', ')}
       FROM ica_survey_response sr
       INNER JOIN community c ON c.community_id = sr.community_id
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY sr.year DESC, sr.quarter DESC, c.community_name ASC`,
    parametros,
  );

  return filas.map((fila) => {
    const objeto = { comuna: fila.comuna, year: Number(fila.year), quarter: Number(fila.quarter) };
    CAMPOS_ENCUESTA.forEach(([campoJs, col]) => { objeto[campoJs] = fila[col]; });
    return objeto;
  });
}

// Exporta TODAS las respuestas crudas (sin calcular nada) mientras el
// motor de scoring sigue bloqueado.
async function generarExportacionRespuestasIca({ campusId, year, quarter, communityId, formato = 'json' }) {
  const filas = await obtenerRespuestasIcaExport({ campusId, year, quarter, communityId });
  const fechaTexto = new Date().toISOString().slice(0, 10);
  const nombreBase = `respuestas_ica_${fechaTexto}`;
  const columnasClave = ['comuna', 'year', 'quarter', ...CAMPOS_ENCUESTA.map(([campoJs]) => campoJs)];
  const encabezados = ['Comuna', 'Año', 'Trimestre', ...ENCABEZADOS_ESPERADOS];

  if (formato === 'json') {
    return { contenido: JSON.stringify(filas, null, 2), nombreArchivo: `${nombreBase}.json`, mimeType: 'application/json' };
  }

  if (formato === 'csv') {
    const lineas = [encabezados.map(escaparCsv).join(',')];
    for (const fila of filas) lineas.push(columnasClave.map((clave) => escaparCsv(fila[clave])).join(','));
    return { contenido: lineas.join('\n'), nombreArchivo: `${nombreBase}.csv`, mimeType: 'text/csv; charset=utf-8' };
  }

  // xlsx por defecto
  const filasHoja = filas.map((fila) => columnasClave.map((clave) => fila[clave] ?? ''));
  const hoja = xlsx.utils.aoa_to_sheet([encabezados, ...filasHoja]);
  const libro = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(libro, hoja, 'Respuestas ICA');
  const contenido = xlsx.write(libro, { type: 'buffer', bookType: 'xlsx' });
  return { contenido, nombreArchivo: `${nombreBase}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}
// US22: dataset completo del ICA (los índices ya calculados, agregados por
// comuna y período) — lo que un Usuario descarga para analizar por su cuenta.
async function obtenerDatasetIcaExport({ campusId, year, quarter, communityId, genero }) {
  // Sin campusId (visitante o superadmin con "Todas") exporta todas las sedes.
  const condiciones = ['c.status = 1', 'm.status = 1'];
  const parametros = [];
  if (campusId) { condiciones.unshift('c.campus_id = ?'); parametros.unshift(campusId); }

  if (year) { condiciones.push('m.year = ?'); parametros.push(year); }
  if (quarter) { condiciones.push('m.quarter = ?'); parametros.push(quarter); }
  if (communityId) { condiciones.push('m.community_id = ?'); parametros.push(communityId); }

  const [filas] = await pool.query(
    `SELECT c.community_name AS comuna, m.year, m.quarter,
            AVG(m.knowledge_index) AS conocimiento,
            AVG(m.usage_index) AS uso,
            AVG(m.education_index) AS educacion,
            AVG(m.foresight_index) AS prevision,
            AVG(m.ica_male) AS ica_hombres,
            AVG(m.ica_female) AS ica_mujeres
       FROM ica_measurement m
       INNER JOIN community c ON c.community_id = m.community_id
      WHERE ${condiciones.join(' AND ')}
      GROUP BY c.community_name, m.year, m.quarter
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    parametros,
  );

  return filas
  .map((fila) => {
    const general = icaPonderado({
      conocimiento: fila.conocimiento,
      uso: fila.uso,
      educacion: fila.educacion,
      prevision: fila.prevision,
    });

    // Igual que transformarMedicion: con género filtrado, el índice general
    // es el ICA de ese grupo; si no tiene datos (0), la comuna se descarta.
    const valorGenero = genero === 'hombres' ? Number(fila.ica_hombres) : Number(fila.ica_mujeres);
    const icaGeneral = genero
      ? (valorGenero > 0 ? valorGenero : null)
      : (general === null ? null : Number(general.toFixed(1)));

    return {
      comuna: fila.comuna,
      year: Number(fila.year),
      quarter: Number(fila.quarter),
      conocimiento: Number(fila.conocimiento),
      uso: Number(fila.uso),
      educacion: Number(fila.educacion),
      prevision: Number(fila.prevision),
      icaHombres: Number(fila.ica_hombres),
      icaMujeres: Number(fila.ica_mujeres),
      icaGeneral,
    };
  })
  .filter((fila) => fila.icaGeneral !== null);
}


module.exports = {
  obtenerComunidadesPorSede,
  obtenerDashboard,
  obtenerExploradorPreguntas,
  registrarRegistroIndividual,
  registrarEntrevistaIndividual,
  obtenerHistorialIca,
  eliminarRegistroIndividual,
  obtenerDetalleRegistroIca,
  verificarCargaIca,
  generarDescargaRegistroIndividual,
  generarExportacionRespuestasIca,
  obtenerDatasetIcaExport,
  estadoInicialCarga,
  CAMPOS_ENCUESTA,
  recalcularAgregadoManual,
};