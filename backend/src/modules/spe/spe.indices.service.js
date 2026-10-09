const pool = require('../../config/db');
const { ESTADO, ESTADO_CARGA, MODULO } = require('../../config/estados');

// US61/US63 — Índices SOCOMEX–SOCIFIN (metodología definida por el equipo;
// el cliente no entregó fórmulas). Todos en escala 0 a 100:
//   - escalas 1–5: (valor - 1) * 25
//   - Sí/No: Sí = 100, No = 0
//   - opciones ordenadas: tabla de puntajes de cada pregunta (abajo)
// Así el promedio funciona como índice de difusión: 50 = neutral.
// Cada índice es el promedio simple de sus indicadores (los vacíos no cuentan).

const SI_NO = { Sí: 100, No: 0 };
const RANGO_PORCENTAJE = { 'Menos del 25%': 0, '26% al 50%': 33, '51% al 75%': 67, 'Más del 75%': 100 };
const EXPECTATIVA = {
  'Aumentará significativamente': 100,
  'Aumentará moderadamente': 75,
  Estable: 50,
  'Disminuirá moderadamente': 25,
  'Disminuirá significativamente': 0,
};
// Inflación y tipo de cambio: que suban es malo para el exportador (invertidas).
const EXPECTATIVA_INVERTIDA = {
  'Aumentará significativamente': 0,
  'Aumentará moderadamente': 25,
  Estable: 50,
  'Disminuirá moderadamente': 75,
  'Disminuirá significativamente': 100,
};

const INDICADORES = {
  // IEE — Expectativas Empresariales Exportadoras (sección II)
  iee: [
    ['s2_bolivia_economy_score', 'scale'],
    ['s2_company_economy_score', 'scale'],
    ['s2_export_sector_score', 'scale'],
    ['s2_gdp_expectation', EXPECTATIVA],
    ['s2_inflation_expectation', EXPECTATIVA_INVERTIDA],
    ['s2_exchange_rate_expectation', EXPECTATIVA_INVERTIDA],
    ['s2_company_exports_expectation', {
      'Aumentarán significativamente': 100,
      'Aumentarán moderadamente': 75,
      Estables: 50,
      'Disminuirán moderadamente': 25,
      'Disminuirán significativamente': 0,
    }],
  ],
  // ICE — Competitividad Exportadora (sección IV)
  ice: [
    ['s4_price_score', 'scale'], ['s4_quality_score', 'scale'],
    ['s4_innovation_score', 'scale'], ['s4_value_added_score', 'scale'],
    ['s4_deadlines_score', 'scale'], ['s4_customer_service_score', 'scale'],
    ['s4_sustainability_score', 'scale'],
    ['s4_value_added_share', RANGO_PORCENTAJE],
    ['s4_has_certifications', SI_NO],
  ],
  // IIE — Internacionalización Empresarial (secciones I, III y V)
  iie: [
    ['s1_markets_served', { 1: 0, '2 a 3': 33, '4 a 5': 67, 'Más de 5': 100 }],
    ['s1_export_income_share', RANGO_PORCENTAJE],
    ['s1_years_exporting', { 'Menos de 5': 0, '6 a 10': 33, '11 a 20': 67, 'Más de 20': 100 }],
    ['s3_plans_new_markets', SI_NO],
    ['s3_expansion_priority_score', 'scale'],
    ['s3_market_analysis_frequency', { Nunca: 0, Ocasionalmente: 25, Semestralmente: 50, Trimestralmente: 75, Permanentemente: 100 }],
    ['s3_attended_trade_fairs', SI_NO],
    ['s3_plans_trade_promotion', SI_NO],
    ['s5_uses_tariff_preferences', { Sí: 100, Parcialmente: 50, No: 0 }],
  ],
  // ICIE — Clima para la Inversión Exportadora (secciones V, VI, VII y VIII)
  icie: [
    ['s6_financing_access_score', 'scale'], ['s6_business_liquidity_score', 'scale'],
    ['s6_fx_availability_score', 'scale'],
    ['s6_fx_shortage_impact', { Mucho: 0, Moderadamente: 33, Poco: 67, Nada: 100 }],
    ['s7_legal_certainty_score', 'scale'], ['s7_regulatory_stability_score', 'scale'],
    ['s7_institutional_transparency_score', 'scale'], ['s7_policy_predictability_score', 'scale'],
    ['s5_intl_logistics_score', 'scale'], ['s5_intl_transport_score', 'scale'],
    ['s5_customs_clearance_score', 'scale'], ['s5_logistics_costs_score', 'scale'],
    ['s5_logistics_infrastructure_score', 'scale'], ['s5_trade_facilitation_score', 'scale'],
    ['s8_invested_last_12m', SI_NO],
    ['s8_will_invest_next_12m', SI_NO],
  ],
};
// No entran en ningún índice (son filtros o descriptivas): departamento, sector,
// tamaño, destino, modalidad, acuerdo, barrera principal, ventaja, debilidad,
// fuente de financiamiento, instrumentos, regulaciones, medida de mayor impacto,
// razones para invertir y las escalas s8_*_score de "qué mejoraría sus
// expectativas" (miden importancia, no situación).

function puntuar(valor, regla) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (regla === 'scale') {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? (numero - 1) * 25 : null;
  }
  const puntaje = regla[String(valor)];
  return puntaje === undefined ? null : puntaje;
}

function calcularIndice(respuesta, indicadores) {
  const puntajes = indicadores
    .map(([campo, regla]) => puntuar(respuesta[campo], regla))
    .filter((valor) => valor !== null);
  return puntajes.length
    ? Number((puntajes.reduce((total, valor) => total + valor, 0) / puntajes.length).toFixed(2))
    : null;
}

function calcularIndicesRespuesta(respuesta) {
  return Object.fromEntries(
    Object.entries(INDICADORES).map(([indice, indicadores]) => [
      indice,
      calcularIndice(respuesta, indicadores),
    ]),
  );
}

async function calcularIndicesSpe(dataLoadId, conexion = pool) {
  if (!Number.isInteger(Number(dataLoadId)) || Number(dataLoadId) <= 0) {
    throw new Error('CARGA_SPE_INVALIDA');
  }

  const [respuestas] = await conexion.query(
    `SELECT sr.*
       FROM spe_survey_response sr
       INNER JOIN data_load dl ON dl.data_load_id = sr.data_load_id
      WHERE sr.data_load_id = ?
        AND sr.status = ?
        AND dl.module = ?
        AND dl.status = ?`,
    [dataLoadId, ESTADO.ACTIVO, MODULO.SPE, ESTADO_CARGA.APROBADA],
  );

  for (const respuesta of respuestas) {
    const indices = calcularIndicesRespuesta(respuesta);
    await conexion.query(
      `INSERT INTO spe_index_score
         (spe_survey_response_id, iee, ice, iie, icie)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         iee = VALUES(iee),
         ice = VALUES(ice),
         iie = VALUES(iie),
         icie = VALUES(icie)`,
      [respuesta.spe_survey_response_id, indices.iee, indices.ice, indices.iie, indices.icie],
    );
  }

  return { dataLoadId: Number(dataLoadId), procesadas: respuestas.length };
}

module.exports = { calcularIndicesSpe, calcularIndicesRespuesta, puntuar };
