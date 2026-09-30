// Liz — US35 (dashboard) y US34 (filtro por sector exportador).
//
// Encuesta: ENCUESTA ÚNICA INTEGRADA SOCOMEX–SOCIFIN (8 secciones).
// Tablas: spe_survey_response (una fila por empresa) + spe_index_score (sus 4 índices).
//
// Contrato (lo usan el controlador del dashboard y los insights de Kevin Alanes):
//   obtenerDashboardSpe(filtros) -> {
//     periodo: { year, semester } | null,
//     totalEmpresas: number,
//     indices: { iee, ice, iie, icie },          // promedio de spe_index_score (null mientras no haya fórmulas, US63)
//     indicesAnterior: { iee, ice, iie, icie } | null,   // mismo cálculo del semestre anterior (para variaciones)
//     secciones: {
//       caracterizacion:     { departamento: [...], sector: [...], tamano: [...], destino: [...] },   // conteo por opción
//       expectativas:        { pib: [...], inflacion: [...], tipoCambio: [...], exportaciones: [...], situacion: {...} },
//       internacionalizacion: { nuevosMercados: %, prioridadPromedio, frecuencia: [...], modalidad: [...] },
//       competitividad:      { factores: [{ factor, promedio }], certificaciones: [{ certificacion, porcentaje }] },
//       comercio:            { barreraPrincipal: [{ barrera, porcentaje }], logistica: [{ factor, promedio }] },
//       financiero:          { factores: [{ factor, promedio }], instrumentos: [...], regulaciones: [...] },
//       institucional:       { factores: [{ factor, promedio }], medidaMayorImpacto: [...] },
//       inversion:           { invirtio: %, invertira: %, factores: [{ factor, promedio }] },
//     },
//     opcionesFiltros: { periodos: [...], departamentos: [...], sectores: [...], tamanos: [...] },
//   }
// Conteos: [{ opcion, cantidad, porcentaje }]. Escalas 1–5: promedio.
// Solo cuentan encuestas aprobadas: data_load.status = ESTADO_CARGA.APROBADA (config/estados.js).
const pool = require('../../config/db');
const { ESTADO, ESTADO_CARGA, MODULO } = require('../../config/estados');

function construirCondiciones(filtros) {
  const condiciones = ['dl.module = ?', 'dl.status = ?', 'sr.status = ?'];
  const parametros = [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO];

  if (filtros.year) {
    condiciones.push('sr.year = ?');
    parametros.push(filtros.year);
  }
  if (filtros.semester) {
    condiciones.push('sr.semester = ?');
    parametros.push(filtros.semester);
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
  return { sql: condiciones.join(' AND '), parametros };
}
function obtenerPeriodoAnterior(year, semester) {
  if (!semester) return { year: year - 1 };
  if (semester === 1) return { year: year - 1, semester: 2 };
  return { year, semester: 1 };
}
function construirCondicionesAnterior(filtros, periodoAnterior) {
  const condiciones = ['dl.module = ?', 'dl.status = ?', 'sr.status = ?', 'sr.year = ?'];
const parametros = [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO, periodoAnterior.year];
if (periodoAnterior.semester) {
  condiciones.push('sr.semester = ?');
  parametros.push(periodoAnterior.semester);
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

  return {
    sql: condiciones.join(' AND '),
    parametros,
  };
}
const EXPECTATIVAS = [
  'Disminuirá significativamente',
  'Disminuirá moderadamente',
  'Estable',
  'Aumentará moderadamente',
  'Aumentará significativamente',
];

function porcentaje(cantidad, total) {
  return total ? Number(((cantidad / total) * 100).toFixed(1)) : 0;
}

function contar(rows, campo) {
  const mapa = new Map();
  rows.forEach((row) => {
    if (row[campo] !== null && row[campo] !== undefined && row[campo] !== '') {
      mapa.set(row[campo], (mapa.get(row[campo]) || 0) + 1);
    }
  });
  return [...mapa.entries()].map(([opcion, cantidad]) => ({ opcion, cantidad, porcentaje: porcentaje(cantidad, rows.length) }));
}

function promedio(rows, campos) {
  return campos.map(([campo, etiqueta]) => {
    const valores = rows.map((row) => Number(row[campo])).filter(Number.isFinite);
    return { factor: etiqueta, promedio: valores.length ? Number((valores.reduce((total, valor) => total + valor, 0) / valores.length).toFixed(2)) : null };
  });
}

function construirSecciones(rows) {
  const expectativa = (campo) => EXPECTATIVAS.map((categoria) => ({
    categoria,
    cantidad: rows.filter((row) => row[campo] === categoria).length,
    porcentaje: porcentaje(rows.filter((row) => row[campo] === categoria).length, rows.length),
  }));
  const propension = contar(rows, 's8_will_invest_next_12m').map((item) => ({ name: item.opcion, value: item.porcentaje }));

  return {
    caracterizacion: {
      departamento: contar(rows, 's1_department'),
      sector: contar(rows, 's1_export_sector'),
      tamano: contar(rows, 's1_company_size'),
      destino: contar(rows, 's1_main_destination'),
    },
    expectativas: {
      pib: expectativa('s2_gdp_expectation'),
      inflacion: expectativa('s2_inflation_expectation'),
      tipoCambio: expectativa('s2_exchange_rate_expectation'),
      exportaciones: expectativa('s2_company_exports_expectation'),
    },
    internacionalizacion: {
      nuevosMercados: porcentaje(rows.filter((row) => row.s3_plans_new_markets === 'Sí').length, rows.length),
      prioridadPromedio: promedio(rows, [['s3_expansion_priority_score', 'Prioridad de expansión']])[0]?.promedio,
      frecuencia: contar(rows, 's3_market_analysis_frequency'),
      modalidad: contar(rows, 's3_access_modality'),
    },
    competitividad: {
      factores: promedio(rows, [
        ['s4_price_score', 'Precio'], ['s4_quality_score', 'Calidad'], ['s4_innovation_score', 'Innovación'],
        ['s4_value_added_score', 'Valor agregado'], ['s4_deadlines_score', 'Cumplimiento'],
        ['s4_customer_service_score', 'Atención al cliente'], ['s4_sustainability_score', 'Sostenibilidad'],
      ]),
      certificaciones: [
        ['s4_cert_iso', 'ISO'], ['s4_cert_organic', 'Orgánica'], ['s4_cert_fair_trade', 'Comercio justo'],
        ['s4_cert_haccp', 'HACCP'], ['s4_cert_other', 'Otra'],
      ].map(([campo, certificacion]) => ({ certificacion, porcentaje: porcentaje(rows.filter((row) => Number(row[campo]) === 1).length, rows.length) })),
    },
    comercio: {
      barreraPrincipal: contar(rows, 's5_main_export_barrier').map(({ opcion, cantidad, porcentaje: valor }) => ({ barrera: opcion, cantidad, porcentaje: valor })),
      logistica: promedio(rows, [
        ['s5_intl_logistics_score', 'Logística internacional'], ['s5_intl_transport_score', 'Transporte internacional'],
        ['s5_customs_clearance_score', 'Despacho aduanero'], ['s5_logistics_costs_score', 'Costos logísticos'],
        ['s5_logistics_infrastructure_score', 'Infraestructura'], ['s5_trade_facilitation_score', 'Facilitación comercial'],
      ]),
    },
    financiero: {
      factores: promedio(rows, [['s6_financing_access_score', 'Acceso a financiamiento'], ['s6_business_liquidity_score', 'Liquidez'], ['s6_fx_availability_score', 'Disponibilidad de divisas']]),
      instrumentos: [],
      regulaciones: [],
    },
    institucional: {
      factores: promedio(rows, [['s7_legal_certainty_score', 'Seguridad jurídica'], ['s7_regulatory_stability_score', 'Estabilidad regulatoria'], ['s7_institutional_transparency_score', 'Transparencia institucional'], ['s7_policy_predictability_score', 'Previsibilidad']]),
      medidaMayorImpacto: contar(rows, 's7_highest_impact_measure'),
    },
    inversion: {
      invirtio: porcentaje(rows.filter((row) => row.s8_invested_last_12m === 'Sí').length, rows.length),
      invertira: porcentaje(rows.filter((row) => row.s8_will_invest_next_12m === 'Sí').length, rows.length),
      propension,
      factores: promedio(rows, [['s8_macro_stability_score', 'Estabilidad macroeconómica'], ['s8_fx_access_score', 'Acceso a divisas'], ['s8_financing_score', 'Financiamiento'], ['s8_legal_certainty_score', 'Seguridad jurídica'], ['s8_simpler_procedures_score', 'Trámites simplificados'], ['s8_new_trade_agreements_score', 'Acuerdos comerciales'], ['s8_logistics_improvement_score', 'Mejora logística'], ['s8_new_markets_score', 'Nuevos mercados']]),
    },
  };
}

async function obtenerOpcionesFiltros() {
  const consultas = [
    pool.query(
      `SELECT DISTINCT year, semester
         FROM spe_survey_response sr
         INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
        WHERE dl.module = ? AND dl.status = ? AND sr.status = ?
        ORDER BY year DESC, semester DESC`,
      [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO],
    ),
    pool.query(
      `SELECT DISTINCT s1_department AS opcion
         FROM spe_survey_response sr
         INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
        WHERE dl.module = ? AND dl.status = ? AND sr.status = ? AND s1_department IS NOT NULL
        ORDER BY opcion`,
      [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO],
    ),
    pool.query(
      `SELECT DISTINCT s1_export_sector AS opcion
         FROM spe_survey_response sr
         INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
        WHERE dl.module = ? AND dl.status = ? AND sr.status = ? AND s1_export_sector IS NOT NULL
        ORDER BY opcion`,
      [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO],
    ),
    pool.query(
      `SELECT DISTINCT s1_company_size AS opcion
         FROM spe_survey_response sr
         INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
        WHERE dl.module = ? AND dl.status = ? AND sr.status = ? AND s1_company_size IS NOT NULL
        ORDER BY opcion`,
      [MODULO.SPE, ESTADO_CARGA.APROBADA, ESTADO.ACTIVO],
    ),
  ];

  const resultados = await Promise.all(consultas);
  const convertir = (filas) => filas.map((fila) => fila.opcion);
  return {
    periodos: resultados[0][0].map((fila) => ({ year: Number(fila.year), semester: Number(fila.semester) })),
    departamentos: convertir(resultados[1][0]),
    sectores: convertir(resultados[2][0]),
    tamanos: convertir(resultados[3][0]),
  };
}
// Último período real con datos, respetando los demás filtros (departamento, sector, tamaño).
async function obtenerUltimoPeriodo(condiciones) {
  const [rows] = await pool.query(
    `SELECT sr.year, sr.semester
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE ${condiciones.sql}
      ORDER BY sr.year DESC, sr.semester DESC
      LIMIT 1`,
    condiciones.parametros,
  );
  return rows[0] ? { year: Number(rows[0].year), semester: Number(rows[0].semester) } : null;
}
async function obtenerDashboardSpe(filtros = {}) {
  const condiciones = construirCondiciones(filtros);
  const opcionesFiltros = await obtenerOpcionesFiltros();

  const [[resumen]] = await pool.query(
    `SELECT COUNT(*) AS totalEmpresas,
            MAX(sr.year) AS year,
            MAX(sr.semester) AS semester
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE ${condiciones.sql}`,
    condiciones.parametros,
  );

  const [indicesRows] = await pool.query(
    `SELECT AVG(iscore.iee) AS iee, AVG(iscore.ice) AS ice,
            AVG(iscore.iie) AS iie, AVG(iscore.icie) AS icie
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
       LEFT JOIN spe_index_score iscore ON iscore.spe_survey_response_id = sr.spe_survey_response_id
      WHERE ${condiciones.sql}`,
    condiciones.parametros,
  );

  const [respuestas] = await pool.query(
    `SELECT sr.*
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE ${condiciones.sql}`,
    condiciones.parametros,
  );

  const indice = indicesRows[0] || {};
const numero = (valor) => (valor === null || valor === undefined ? null : Number(Number(valor).toFixed(2)));
const periodo = !resumen?.year
  ? null
  : filtros.year || filtros.semester
    ? { year: filtros.year ?? null, semester: filtros.semester ?? null }
    : await obtenerUltimoPeriodo(condiciones);

let indicesAnterior = null;

if (filtros.year) {
  const periodoAnterior = obtenerPeriodoAnterior(filtros.year, filtros.semester);
  const condicionesAnterior = construirCondicionesAnterior(filtros, periodoAnterior);

  const [indicesAnteriorRows] = await pool.query(
    `SELECT AVG(iscore.iee) AS iee,
            AVG(iscore.ice) AS ice,
            AVG(iscore.iie) AS iie,
            AVG(iscore.icie) AS icie
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
       LEFT JOIN spe_index_score iscore
         ON iscore.spe_survey_response_id = sr.spe_survey_response_id
      WHERE ${condicionesAnterior.sql}`,
    condicionesAnterior.parametros,
  );

  const indiceAnterior = indicesAnteriorRows[0] || {};

  indicesAnterior = {
    iee: numero(indiceAnterior.iee),
    ice: numero(indiceAnterior.ice),
    iie: numero(indiceAnterior.iie),
    icie: numero(indiceAnterior.icie),
  };
}

return {
  periodo,
  totalEmpresas: Number(resumen?.totalEmpresas || 0),
  indices: { iee: numero(indice.iee), ice: numero(indice.ice), iie: numero(indice.iie), icie: numero(indice.icie) },
  indicesAnterior,
  secciones: construirSecciones(respuestas),
  opcionesFiltros,
};
}

module.exports = { obtenerDashboardSpe };
