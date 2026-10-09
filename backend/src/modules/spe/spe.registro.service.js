const pool = require('../../config/db');
const { ESTADO_CARGA, MODULO, TIPO_CARGA } = require('../../config/estados');
const { calcularIndicesSpe } = require('./spe.indices.service');

// Campo del formulario (views/spe/spe.questions.js) -> columna de spe_survey_response.
// Mapeo explícito: un nombre mal armado hacía fallar el INSERT o, peor, guardar vacío.
const CAMPOS = [
  // I. Caracterización empresarial
  ['department', 's1_department'],
  ['exportSector', 's1_export_sector'],
  ['exportSectorOther', 's1_export_sector_other'],
  ['companySize', 's1_company_size'],
  ['yearsExporting', 's1_years_exporting'],
  ['marketsServed', 's1_markets_served'],
  ['exportIncomeShare', 's1_export_income_share'],
  ['mainDestination', 's1_main_destination'],
  ['mainDestinationOther', 's1_main_destination_other'],
  // II. Situación económica y expectativas
  ['boliviaEconomyScore', 's2_bolivia_economy_score'],
  ['companyEconomyScore', 's2_company_economy_score'],
  ['exportSectorScore', 's2_export_sector_score'],
  ['gdpExpectation', 's2_gdp_expectation'],
  ['inflationExpectation', 's2_inflation_expectation'],
  ['exchangeRateExpectation', 's2_exchange_rate_expectation'],
  ['companyExportsExpectation', 's2_company_exports_expectation'],
  // III. Internacionalización
  ['plansNewMarkets', 's3_plans_new_markets'],
  ['expansionPriorityScore', 's3_expansion_priority_score'],
  ['marketAnalysisFrequency', 's3_market_analysis_frequency'],
  ['accessModality', 's3_access_modality'],
  ['accessModalityOther', 's3_access_modality_other'],
  ['attendedTradeFairs', 's3_attended_trade_fairs'],
  ['plansTradePromotion', 's3_plans_trade_promotion'],
  // IV. Competitividad exportadora
  ['priceScore', 's4_price_score'],
  ['qualityScore', 's4_quality_score'],
  ['innovationScore', 's4_innovation_score'],
  ['valueAddedScore', 's4_value_added_score'],
  ['deadlinesScore', 's4_deadlines_score'],
  ['customerServiceScore', 's4_customer_service_score'],
  ['sustainabilityScore', 's4_sustainability_score'],
  ['valueAddedShare', 's4_value_added_share'],
  ['hasCertifications', 's4_has_certifications'],
  ['certificationsOther', 's4_cert_other_text'],
  // V. Comercio internacional y acceso a mercados
  ['bestTradeAgreement', 's5_best_trade_agreement'],
  ['bestTradeAgreementOther', 's5_best_trade_agreement_other'],
  ['usesTariffPreferences', 's5_uses_tariff_preferences'],
  ['mainExportBarrier', 's5_main_export_barrier'],
  ['intlLogisticsScore', 's5_intl_logistics_score'],
  ['intlTransportScore', 's5_intl_transport_score'],
  ['customsClearanceScore', 's5_customs_clearance_score'],
  ['logisticsCostsScore', 's5_logistics_costs_score'],
  ['logisticsInfrastructureScore', 's5_logistics_infrastructure_score'],
  ['tradeFacilitationScore', 's5_trade_facilitation_score'],
  ['mainCompetitiveAdvantage', 's5_main_competitive_advantage'],
  ['mainCompetitiveWeakness', 's5_main_competitive_weakness'],
  // VI. Condiciones financieras
  ['financingAccessScore', 's6_financing_access_score'],
  ['businessLiquidityScore', 's6_business_liquidity_score'],
  ['fxAvailabilityScore', 's6_fx_availability_score'],
  ['fxShortageImpact', 's6_fx_shortage_impact'],
  ['mainFinancingSource', 's6_main_financing_source'],
  // VII. Entorno institucional
  ['legalCertaintyScore', 's7_legal_certainty_score'],
  ['regulatoryStabilityScore', 's7_regulatory_stability_score'],
  ['institutionalTransparencyScore', 's7_institutional_transparency_score'],
  ['policyPredictabilityScore', 's7_policy_predictability_score'],
  ['highestImpactMeasure', 's7_highest_impact_measure'],
  // VIII. Inversión y perspectiva futura
  ['investedLast12m', 's8_invested_last_12m'],
  ['willInvestNext12m', 's8_will_invest_next_12m'],
  ['reasonToInvest', 's8_reason_to_invest'],
  ['reasonNotToInvest', 's8_reason_not_to_invest'],
  ['macroStabilityScore', 's8_macro_stability_score'],
  ['fxAccessScore', 's8_fx_access_score'],
  ['financingScore', 's8_financing_score'],
  ['legalCertaintyInvestmentScore', 's8_legal_certainty_score'],
  ['simplerProceduresScore', 's8_simpler_procedures_score'],
  ['newTradeAgreementsScore', 's8_new_trade_agreements_score'],
  ['logisticsImprovementScore', 's8_logistics_improvement_score'],
  ['newMarketsScore', 's8_new_markets_score'],
];

// Opciones de las preguntas de varias opciones -> columna 0/1.
const CHECKBOX_COLUMNAS = {
  certifications: {
    ISO: 's4_cert_iso',
    Orgánica: 's4_cert_organic',
    'Comercio Justo': 's4_cert_fair_trade',
    HACCP: 's4_cert_haccp',
    Otras: 's4_cert_other',
  },
  instruments: {
    'Acuerdos comerciales internacionales': 's6_instr_trade_agreements',
    'Sistema Generalizado de Preferencias (SGP)': 's6_instr_sgp',
    'Régimen de Reintegro Arancelario': 's6_instr_tariff_refund',
    'Comercializadoras internacionales': 's6_instr_trading_companies',
    'Regulaciones regionales': 's6_instr_regional_regulations',
    Ninguno: 's6_instr_none',
  },
  regulations: {
    'Control de cambios': 's6_reg_exchange_controls',
    'Restricciones a las exportaciones': 's6_reg_export_restrictions',
    'Medidas no arancelarias': 's6_reg_non_tariff_measures',
    'Impuestos a la exportación': 's6_reg_export_taxes',
    'Incertidumbre regulatoria': 's6_reg_regulatory_uncertainty',
    'Procedimientos aduaneros complejos': 's6_reg_complex_customs',
  },
};

function construirRespuesta(respuestas) {
  const columnas = [];
  const valores = [];
  CAMPOS.forEach(([campo, columna]) => {
    columnas.push(columna);
    valores.push(respuestas[campo] ?? null);
  });
  Object.entries(CHECKBOX_COLUMNAS).forEach(([campo, opciones]) => {
    const seleccionadas = respuestas[campo] || [];
    Object.entries(opciones).forEach(([opcion, columna]) => {
      columnas.push(columna);
      valores.push(seleccionadas.includes(opcion) ? 1 : 0);
    });
  });
  return { columnas, valores };
}

// US37: registro individual del Superadmin (entra APROBADO y calcula sus índices).
async function registrarRegistroIndividual({ userId, ...respuestas }) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [MODULO.SPE, TIPO_CARGA.INDIVIDUAL, 'Registro individual', ESTADO_CARGA.APROBADA, userId],
    );
    const { columnas, valores } = construirRespuesta(respuestas);
    const [respuesta] = await conexion.query(
      `INSERT INTO spe_survey_response
         (data_load_id, year, semester, surveyor_user_id, event_id, ${columnas.join(', ')}, status)
       VALUES (?, ?, ?, ?, ?, ${columnas.map(() => '?').join(', ')}, 1)`,
      [carga.insertId, respuestas.year, respuestas.semester, userId, null, ...valores],
    );

    await calcularIndicesSpe(carga.insertId, conexion);

    await conexion.commit();
    return { dataLoadId: carga.insertId, surveyResponseId: respuesta.insertId };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { registrarRegistroIndividual, CAMPOS, CHECKBOX_COLUMNAS, construirRespuesta };
