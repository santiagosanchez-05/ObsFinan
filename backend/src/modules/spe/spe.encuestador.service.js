// backend/src/modules/spe/spe.encuestador.service.js
// Kevin Alanes — US66. El encuestador registra una encuesta SPE en un evento.
const pool = require("../../config/db");
const {
  ESTADO_CARGA,
  MODULO,
  TIPO_CARGA,
  ESTADO,
} = require("../../config/estados");

// ---------------------------------------------------------------------------
// Mapeo: campo del formulario → columna real en spe_survey_response
// ---------------------------------------------------------------------------
const MAPEO_CAMPOS = {
  // Sección 1
  department: "s1_department",
  exportSector: "s1_export_sector",
  companySize: "s1_company_size",
  yearsExporting: "s1_years_exporting",
  marketsServed: "s1_markets_served",
  exportIncomeShare: "s1_export_income_share",
  mainDestination: "s1_main_destination",
  // Sección 2
  boliviaEconomyScore: "s2_bolivia_economy_score",
  companyEconomyScore: "s2_company_economy_score",
  exportSectorScore: "s2_export_sector_score",
  gdpExpectation: "s2_gdp_expectation",
  inflationExpectation: "s2_inflation_expectation",
  exchangeRateExpectation: "s2_exchange_rate_expectation",
  companyExportsExpectation: "s2_company_exports_expectation",
  // Sección 3
  plansNewMarkets: "s3_plans_new_markets",
  expansionPriorityScore: "s3_expansion_priority_score",
  marketAnalysisFrequency: "s3_market_analysis_frequency",
  accessModality: "s3_access_modality",
  attendedTradeFairs: "s3_attended_trade_fairs",
  plansTradePromotion: "s3_plans_trade_promotion",
  // Sección 4
  priceScore: "s4_price_score",
  qualityScore: "s4_quality_score",
  innovationScore: "s4_innovation_score",
  valueAddedScore: "s4_value_added_score",
  deadlinesScore: "s4_deadlines_score",
  customerServiceScore: "s4_customer_service_score",
  sustainabilityScore: "s4_sustainability_score",
  valueAddedShare: "s4_value_added_share",
  hasCertifications: "s4_has_certifications",
  // Sección 5
  bestTradeAgreement: "s5_best_trade_agreement",
  usesTariffPreferences: "s5_uses_tariff_preferences",
  mainExportBarrier: "s5_main_export_barrier",
  intlLogisticsScore: "s5_intl_logistics_score",
  intlTransportScore: "s5_intl_transport_score",
  customsClearanceScore: "s5_customs_clearance_score",
  logisticsCostsScore: "s5_logistics_costs_score",
  logisticsInfrastructureScore: "s5_logistics_infrastructure_score",
  tradeFacilitationScore: "s5_trade_facilitation_score",
  mainCompetitiveAdvantage: "s5_main_competitive_advantage",
  mainCompetitiveWeakness: "s5_main_competitive_weakness",
  // Sección 6
  financingAccessScore: "s6_financing_access_score",
  businessLiquidityScore: "s6_business_liquidity_score",
  fxAvailabilityScore: "s6_fx_availability_score",
  fxShortageImpact: "s6_fx_shortage_impact",
  mainFinancingSource: "s6_main_financing_source",
  // Sección 7
  legalCertaintyScore: "s7_legal_certainty_score",
  regulatoryStabilityScore: "s7_regulatory_stability_score",
  institutionalTransparencyScore: "s7_institutional_transparency_score",
  policyPredictabilityScore: "s7_policy_predictability_score",
  highestImpactMeasure: "s7_highest_impact_measure",
  // Sección 8
  investedLast12m: "s8_invested_last_12m",
  willInvestNext12m: "s8_will_invest_next_12m",
  reasonToInvest: "s8_reason_to_invest",
  reasonNotToInvest: "s8_reason_not_to_invest",
  macroStabilityScore: "s8_macro_stability_score",
  fxAccessScore: "s8_fx_access_score",
  financingScore: "s8_financing_score",
  legalCertaintyInvestmentScore: "s8_legal_certainty_score",
  simplerProceduresScore: "s8_simpler_procedures_score",
  newTradeAgreementsScore: "s8_new_trade_agreements_score",
  logisticsImprovementScore: "s8_logistics_improvement_score",
  newMarketsScore: "s8_new_markets_score",
};

const MAPEO_CHECKBOX = {
  certifications: {
    ISO: "s4_cert_iso",
    Orgánica: "s4_cert_organic",
    "Comercio justo": "s4_cert_fair_trade",
    HACCP: "s4_cert_haccp",
    Otra: "s4_cert_other",
  },
  instruments: {
    "Acuerdos comerciales": "s6_instr_trade_agreements",
    SGP: "s6_instr_sgp",
    "Devolución de aranceles": "s6_instr_tariff_refund",
    "Trading companies": "s6_instr_trading_companies",
    "Normativa regional": "s6_instr_regional_regulations",
    Ninguno: "s6_instr_none",
  },
  regulations: {
    "Control de cambios": "s6_reg_exchange_controls",
    "Restricciones a la exportación": "s6_reg_export_restrictions",
    "Medidas no arancelarias": "s6_reg_non_tariff_measures",
    "Impuestos a la exportación": "s6_reg_export_taxes",
    "Incertidumbre regulatoria": "s6_reg_regulatory_uncertainty",
    "Trámites aduaneros complejos": "s6_reg_complex_customs",
  },
};

const ESCALAS = [
  "s2_bolivia_economy_score",
  "s2_company_economy_score",
  "s2_export_sector_score",
  "s3_expansion_priority_score",
  "s4_price_score",
  "s4_quality_score",
  "s4_innovation_score",
  "s4_value_added_score",
  "s4_deadlines_score",
  "s4_customer_service_score",
  "s4_sustainability_score",
  "s5_intl_logistics_score",
  "s5_intl_transport_score",
  "s5_customs_clearance_score",
  "s5_logistics_costs_score",
  "s5_logistics_infrastructure_score",
  "s5_trade_facilitation_score",
  "s6_financing_access_score",
  "s6_business_liquidity_score",
  "s6_fx_availability_score",
  "s7_legal_certainty_score",
  "s7_regulatory_stability_score",
  "s7_institutional_transparency_score",
  "s7_policy_predictability_score",
  "s8_macro_stability_score",
  "s8_fx_access_score",
  "s8_financing_score",
  "s8_legal_certainty_score",
  "s8_simpler_procedures_score",
  "s8_new_trade_agreements_score",
  "s8_logistics_improvement_score",
  "s8_new_markets_score",
];

const ENUMS_DEFAULT = {
  s1_department: "Santa Cruz",
  s1_export_sector: "Agroindustria",
  s1_company_size: "Micro",
  s1_years_exporting: "Menos de 5",
  s1_markets_served: "1",
  s1_export_income_share: "Menos del 25%",
  s1_main_destination: "CAN",
  s2_gdp_expectation: "Estable",
  s2_inflation_expectation: "Estable",
  s2_exchange_rate_expectation: "Estable",
  s2_company_exports_expectation: "Se mantendrán",
  s3_plans_new_markets: "No",
  s3_market_analysis_frequency: "Nunca",
  s3_access_modality: "Exportación directa",
  s3_attended_trade_fairs: "No",
  s3_plans_trade_promotion: "No",
  s4_value_added_share: "Menos del 25%",
  s4_has_certifications: "No",
  s5_uses_tariff_preferences: "No",
  s5_main_export_barrier: "Logística y costo de transporte",
  s6_fx_shortage_impact: "Ninguno",
  s6_main_financing_source: "Recursos propios",
  s8_invested_last_12m: "No",
  s8_will_invest_next_12m: "No",
};

const TEXTOS_NOT_NULL = [
  "s1_markets_served",
  "s1_main_destination",
  "s5_best_trade_agreement",
  "s5_main_competitive_advantage",
  "s5_main_competitive_weakness",
  "s7_highest_impact_measure",
];

function aplicarDefaults(columna, valor) {
  if (valor !== null && valor !== undefined) return valor;
  if (ESCALAS.includes(columna)) return 3;
  if (ENUMS_DEFAULT[columna]) return ENUMS_DEFAULT[columna];
  if (TEXTOS_NOT_NULL.includes(columna)) return "N/A";
  return null;
}

function construirRespuestaCorrecta(respuestas) {
  const columnas = [];
  const valores = [];

  Object.entries(MAPEO_CAMPOS).forEach(([campo, columna]) => {
    columnas.push(columna);
    valores.push(aplicarDefaults(columna, respuestas[campo] ?? null));
  });

  Object.entries(MAPEO_CHECKBOX).forEach(([campo, mapeoOpciones]) => {
    const seleccionadas = respuestas[campo] || [];
    Object.entries(mapeoOpciones).forEach(([opcion, columna]) => {
      columnas.push(columna);
      valores.push(seleccionadas.includes(opcion) ? 1 : 0);
    });
  });

  return { columnas, valores };
}

async function validarEventoDelEncuestador(eventId, surveyorUserId) {
  const [rows] = await pool.query(
    `SELECT e.event_id, e.has_spe, es.surveyor_user_id
       FROM event e
       LEFT JOIN event_surveyor es
         ON es.event_id = e.event_id
        AND es.surveyor_user_id = ?
        AND es.status = ?
      WHERE e.event_id = ?`,
    [surveyorUserId, ESTADO.ACTIVO, eventId],
  );

  if (!rows.length) throw new Error("EVENTO_NO_ENCONTRADO");
  const evento = rows[0];
  if (evento.has_spe !== 1) throw new Error("EVENTO_SIN_SPE");
  if (!evento.surveyor_user_id) throw new Error("ENCUESTADOR_NO_ASIGNADO");
  return evento;
}

async function registrarEncuestaSpe({ userId, eventId, ...respuestas }) {
  await validarEventoDelEncuestador(eventId, userId);

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [carga] = await conexion.query(
      `INSERT INTO data_load 
         (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [
        MODULO.SPE,
        TIPO_CARGA.INDIVIDUAL,
        `Encuesta SPE · Evento ${eventId}`,
        ESTADO_CARGA.PENDIENTE,
        userId,
      ],
    );

    const { columnas, valores } = construirRespuestaCorrecta(respuestas);

    const [respuesta] = await conexion.query(
      `INSERT INTO spe_survey_response
         (data_load_id, year, semester, surveyor_user_id, event_id, ${columnas.join(", ")}, status)
       VALUES (?, ?, ?, ?, ?, ${columnas.map(() => "?").join(", ")}, ?)`,
      [
        carga.insertId,
        respuestas.year,
        respuestas.semester,
        userId,
        eventId,
        ...valores,
        ESTADO.ACTIVO,
      ],
    );

    await conexion.commit();
    return {
      dataLoadId: carga.insertId,
      surveyResponseId: respuesta.insertId,
      status: ESTADO_CARGA.PENDIENTE,
    };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { registrarEncuestaSpe, validarEventoDelEncuestador };
