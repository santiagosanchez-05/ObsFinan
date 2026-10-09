const pool = require('../../config/db');
const { ESTADO_CARGA, MODULO, TIPO_CARGA } = require('../../config/estados');
const { CHECKBOX_FIELDS } = require('./spe.registro.validation');
const { calcularIndicesSpe } = require('./spe.indices.service');

function nombreColumna(campo, seccion, opcion) {
  const sufijosCheckbox = {
    certifications: {
      ISO: 'cert_iso',
      Orgánica: 'cert_organic',
      'Comercio justo': 'cert_fair_trade',
      HACCP: 'cert_haccp',
      Otra: 'cert_other',
    },
    instruments: {
      'Acuerdos comerciales': 'instr_trade_agreements',
      SGP: 'instr_sgp',
      'Devolución de aranceles': 'instr_tariff_refund',
      'Trading companies': 'instr_trading_companies',
      'Normativa regional': 'instr_regional_regulations',
      Ninguno: 'instr_none',
    },
    regulations: {
      'Control de cambios': 'reg_exchange_controls',
      'Restricciones a la exportación': 'reg_export_restrictions',
      'Medidas no arancelarias': 'reg_non_tariff_measures',
      'Impuestos a la exportación': 'reg_export_taxes',
      'Incertidumbre regulatoria': 'reg_regulatory_uncertainty',
      'Trámites aduaneros complejos': 'reg_complex_customs',
    },
  };
  const sufijosCampo = {
    legalCertaintyInvestmentScore: 'legal_certainty_score',
    investedLast12m: 'invested_last_12m',
    willInvestNext12m: 'will_invest_next_12m',
  };
  const sufijo = opcion
    ? sufijosCheckbox[campo][opcion]
    : sufijosCampo[campo] || campo.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
  return `s${seccion}_${sufijo}`;
}

const CAMPOS = [
  ['department', 1], ['exportSector', 1], ['companySize', 1], ['yearsExporting', 1],
  ['marketsServed', 1], ['exportIncomeShare', 1], ['mainDestination', 1],
  ['boliviaEconomyScore', 2], ['companyEconomyScore', 2], ['exportSectorScore', 2],
  ['gdpExpectation', 2], ['inflationExpectation', 2], ['exchangeRateExpectation', 2],
  ['companyExportsExpectation', 2], ['plansNewMarkets', 3], ['expansionPriorityScore', 3],
  ['marketAnalysisFrequency', 3], ['accessModality', 3], ['attendedTradeFairs', 3],
  ['plansTradePromotion', 3], ['priceScore', 4], ['qualityScore', 4], ['innovationScore', 4],
  ['valueAddedScore', 4], ['deadlinesScore', 4], ['customerServiceScore', 4],
  ['sustainabilityScore', 4], ['valueAddedShare', 4], ['hasCertifications', 4],
  ['bestTradeAgreement', 5], ['usesTariffPreferences', 5], ['mainExportBarrier', 5],
  ['intlLogisticsScore', 5], ['intlTransportScore', 5], ['customsClearanceScore', 5],
  ['logisticsCostsScore', 5], ['logisticsInfrastructureScore', 5], ['tradeFacilitationScore', 5],
  ['mainCompetitiveAdvantage', 5], ['mainCompetitiveWeakness', 5], ['financingAccessScore', 6],
  ['businessLiquidityScore', 6], ['fxAvailabilityScore', 6], ['fxShortageImpact', 6],
  ['mainFinancingSource', 6], ['legalCertaintyScore', 7], ['regulatoryStabilityScore', 7],
  ['institutionalTransparencyScore', 7], ['policyPredictabilityScore', 7],
  ['highestImpactMeasure', 7], ['investedLast12m', 8], ['willInvestNext12m', 8],
  ['reasonToInvest', 8], ['reasonNotToInvest', 8], ['macroStabilityScore', 8],
  ['fxAccessScore', 8], ['financingScore', 8], ['legalCertaintyInvestmentScore', 8],
  ['simplerProceduresScore', 8], ['newTradeAgreementsScore', 8], ['logisticsImprovementScore', 8],
  ['newMarketsScore', 8],
];

function construirRespuesta(respuestas) {
  const columnas = [];
  const valores = [];
  CAMPOS.forEach(([campo, seccion]) => {
    columnas.push(nombreColumna(campo, seccion));
    valores.push(respuestas[campo] ?? null);
  });
  Object.entries(CHECKBOX_FIELDS).forEach(([campo, opciones]) => {
    const seleccionadas = respuestas[campo] || [];
    const seccion = campo === 'certifications' ? 4 : 6;
    opciones.forEach((opcion) => {
      columnas.push(nombreColumna(campo, seccion, opcion));
      valores.push(seleccionadas.includes(opcion) ? 1 : 0);
    });
  });
  return { columnas, valores };
}

async function registrarRegistroIndividual({ userId, rol, ...respuestas }) {
  const r = String(rol ?? '').toLowerCase().replace('_', '');
  const estado =
    r === 'admin' || r === 'superadmin'
      ? ESTADO_CARGA.APROBADA
      : ESTADO_CARGA.PENDIENTE;
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [MODULO.SPE, TIPO_CARGA.INDIVIDUAL, 'Registro individual', estado, userId],
    );
    const { columnas, valores } = construirRespuesta(respuestas);
    const [respuesta] = await conexion.query(
      `INSERT INTO spe_survey_response
         (data_load_id, year, semester, surveyor_user_id, event_id, ${columnas.join(', ')}, status)
       VALUES (?, ?, ?, ?, ?, ${columnas.map(() => '?').join(', ')}, 1)`,
      [carga.insertId, respuestas.year, respuestas.semester, userId, null, ...valores],
    );
    if (estado === ESTADO_CARGA.APROBADA) {
      await calcularIndicesSpe(carga.insertId, conexion);
    }
    await conexion.commit();
    return { dataLoadId: carga.insertId, surveyResponseId: respuesta.insertId };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { registrarRegistroIndividual, CAMPOS, construirRespuesta };
