const pool = require('../../config/db');
const { ESTADO, ESTADO_CARGA, MODULO } = require('../../config/estados');

// US63: todos los índices se expresan en una escala común de 0 a 100.
// Las escalas 1–5 se normalizan linealmente; las respuestas Sí/No y las
// escalas ordinales usan el orden visible en el formulario. Los cuatro índices
// son promedios simples de sus indicadores, sin ponderaciones ocultas.
const INDICADORES = {
  iee: [
    ['s3_expansion_priority_score', 'scale'],
    ['s3_market_analysis_frequency', ['Nunca', 'Ocasionalmente', 'Mensualmente', 'Permanentemente']],
    ['s3_plans_new_markets', ['No', 'Sí']],
    ['s3_attended_trade_fairs', ['No', 'Sí']],
    ['s3_plans_trade_promotion', ['No', 'Sí']],
  ],
  ice: [
    ['s4_price_score', 'scale'], ['s4_quality_score', 'scale'],
    ['s4_innovation_score', 'scale'], ['s4_value_added_score', 'scale'],
    ['s4_deadlines_score', 'scale'], ['s4_customer_service_score', 'scale'],
    ['s4_sustainability_score', 'scale'], ['s5_intl_logistics_score', 'scale'],
    ['s5_intl_transport_score', 'scale'], ['s5_customs_clearance_score', 'scale'],
    ['s5_logistics_costs_score', 'scale'], ['s5_logistics_infrastructure_score', 'scale'],
    ['s5_trade_facilitation_score', 'scale'],
  ],
  iie: [
    ['s6_financing_access_score', 'scale'], ['s6_business_liquidity_score', 'scale'],
    ['s6_fx_availability_score', 'scale'], ['s7_legal_certainty_score', 'scale'],
    ['s7_regulatory_stability_score', 'scale'], ['s7_institutional_transparency_score', 'scale'],
    ['s7_policy_predictability_score', 'scale'],
  ],
  icie: [
    ['s2_bolivia_economy_score', 'scale'], ['s2_company_economy_score', 'scale'],
    ['s2_export_sector_score', 'scale'], ['s2_gdp_expectation', 'expectation'],
    ['s2_inflation_expectation', 'expectation'], ['s2_exchange_rate_expectation', 'expectation'],
    ['s2_company_exports_expectation', ['Disminuirán', 'Se mantendrán', 'Aumentarán']],
    ['s8_macro_stability_score', 'scale'], ['s8_fx_access_score', 'scale'],
    ['s8_financing_score', 'scale'], ['s8_legal_certainty_score', 'scale'],
    ['s8_simpler_procedures_score', 'scale'], ['s8_logistics_improvement_score', 'scale'],
    ['s8_new_markets_score', 'scale'],
  ],
};

const EXPECTATIONS = [
  'Disminuirá significativamente',
  'Disminuirá moderadamente',
  'Estable',
  'Aumentará moderadamente',
  'Aumentará significativamente',
];

function puntuar(valor, regla) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (regla === 'scale') {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 1 && numero <= 5
      ? ((numero - 1) / 4) * 100
      : null;
  }
  const opciones = regla === 'expectation' ? EXPECTATIONS : regla;
  const posicion = opciones.indexOf(String(valor));
  return posicion < 0 ? null : (posicion / Math.max(opciones.length - 1, 1)) * 100;
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
