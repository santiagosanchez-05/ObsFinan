const { z } = require('zod');

const OPCIONES = {
  department: ['Santa Cruz', 'La Paz', 'Cochabamba'],
  exportSector: ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'],
  companySize: ['Micro', 'Pequeña', 'Mediana', 'Grande'],
  exportIncomeShare: ['Menos del 25%', '25% - 50%', '51% - 75%', 'Más del 75%'],
  gdpExpectation: ['Disminuirá significativamente', 'Disminuirá moderadamente', 'Estable', 'Aumentará moderadamente', 'Aumentará significativamente'],
  inflationExpectation: ['Disminuirá significativamente', 'Disminuirá moderadamente', 'Estable', 'Aumentará moderadamente', 'Aumentará significativamente'],
  exchangeRateExpectation: ['Disminuirá significativamente', 'Disminuirá moderadamente', 'Estable', 'Aumentará moderadamente', 'Aumentará significativamente'],
  companyExportsExpectation: ['Disminuirán', 'Se mantendrán', 'Aumentarán'],
  marketAnalysisFrequency: ['Nunca', 'Ocasionalmente', 'Mensualmente', 'Permanentemente'],
  accessModality: ['Exportación directa', 'Exportación indirecta', 'Ambas', 'Otra'],
  valueAddedShare: ['Menos del 25%', '25% - 50%', '51% - 75%', 'Más del 75%'],
  mainExportBarrier: ['Logística y costo de transporte', 'Competitividad y valor agregado', 'Burocracia y acuerdos comerciales', 'Exigencias sanitarias y certificaciones', 'Financiamiento y tipo de cambio', 'Dificultad para obtener certificaciones'],
  fxShortageImpact: ['Ninguno', 'Bajo', 'Medio', 'Alto', 'Muy alto'],
  mainFinancingSource: ['Recursos propios', 'Banca comercial', 'Cooperativa', 'Financiamiento externo', 'Otra'],
};

const RADIO_FIELDS = [
  'plansNewMarkets', 'attendedTradeFairs', 'plansTradePromotion', 'hasCertifications',
  'usesTariffPreferences', 'investedLast12m', 'willInvestNext12m',
];

const SCALE_FIELDS = [
  'boliviaEconomyScore', 'companyEconomyScore', 'exportSectorScore', 'expansionPriorityScore',
  'priceScore', 'qualityScore', 'innovationScore', 'valueAddedScore', 'deadlinesScore',
  'customerServiceScore', 'sustainabilityScore', 'intlLogisticsScore', 'intlTransportScore',
  'customsClearanceScore', 'logisticsCostsScore', 'logisticsInfrastructureScore',
  'tradeFacilitationScore', 'financingAccessScore', 'businessLiquidityScore',
  'fxAvailabilityScore', 'legalCertaintyScore', 'regulatoryStabilityScore',
  'institutionalTransparencyScore', 'policyPredictabilityScore', 'macroStabilityScore',
  'fxAccessScore', 'financingScore', 'legalCertaintyInvestmentScore',
  'simplerProceduresScore', 'newTradeAgreementsScore', 'logisticsImprovementScore',
  'newMarketsScore',
];

const TEXT_FIELDS = [
  'marketsServed', 'mainDestination', 'bestTradeAgreement', 'mainCompetitiveAdvantage',
  'mainCompetitiveWeakness', 'highestImpactMeasure', 'reasonToInvest', 'reasonNotToInvest',
];

const NUMBER_FIELDS = ['yearsExporting'];
const CHECKBOX_FIELDS = {
  certifications: ['ISO', 'Orgánica', 'Comercio justo', 'HACCP', 'Otra'],
  instruments: ['Acuerdos comerciales', 'SGP', 'Devolución de aranceles', 'Trading companies', 'Normativa regional', 'Ninguno'],
  regulations: ['Control de cambios', 'Restricciones a la exportación', 'Medidas no arancelarias', 'Impuestos a la exportación', 'Incertidumbre regulatoria', 'Trámites aduaneros complejos'],
};

const stringRequired = z.string().trim().min(1, 'Este campo es obligatorio').max(1000);
const shape = {
  year: z.coerce.number().int().min(2000).max(2100),
  semester: z.coerce.number().int().min(1).max(2),
};

Object.entries(OPCIONES).forEach(([campo, opciones]) => {
  shape[campo] = z.enum(opciones, { message: 'Selecciona una opción' });
});
RADIO_FIELDS.forEach((campo) => { shape[campo] = z.enum(['Sí', 'No'], { message: 'Selecciona una opción' }); });
SCALE_FIELDS.forEach((campo) => { shape[campo] = z.coerce.number().int().min(1).max(5, 'Selecciona un valor de 1 a 5'); });
TEXT_FIELDS.forEach((campo) => { shape[campo] = stringRequired; });
NUMBER_FIELDS.forEach((campo) => { shape[campo] = z.coerce.number().int().min(0).max(1000); });
Object.keys(CHECKBOX_FIELDS).forEach((campo) => {
  shape[campo] = z.array(z.enum(CHECKBOX_FIELDS[campo])).optional().default([]);
});

const registroSpeSchema = z.object(shape).strict();

module.exports = {
  registroSpeSchema,
  CHECKBOX_FIELDS,
  OPCIONES,
  RADIO_FIELDS,
  SCALE_FIELDS,
  TEXT_FIELDS,
  NUMBER_FIELDS,
};
