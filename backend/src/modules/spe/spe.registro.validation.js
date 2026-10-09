const { z } = require('zod');

// Encuesta Única Integrada SOCOMEX–SOCIFIN. Las opciones son EXACTAMENTE los
// ENUM de spe_survey_response (y del Word). La BD no está en modo estricto:
// un valor que no esté en el ENUM se guardaría vacío sin avisar, por eso se
// valida aquí. Si se cambia una opción, cambiarla también en el frontend
// (views/spe/spe.questions.js) y en la BD.

const SI_NO = ['Sí', 'No'];
const RANGO_PORCENTAJE = ['Menos del 25%', '26% al 50%', '51% al 75%', 'Más del 75%'];
const EXPECTATIVA = [
  'Aumentará significativamente',
  'Aumentará moderadamente',
  'Estable',
  'Disminuirá moderadamente',
  'Disminuirá significativamente',
];

const OPCIONES = {
  department: ['Santa Cruz', 'La Paz', 'Cochabamba'],
  exportSector: ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'],
  companySize: ['Micro', 'Pequeña', 'Mediana', 'Grande'],
  yearsExporting: ['Menos de 5', '6 a 10', '11 a 20', 'Más de 20'],
  marketsServed: ['1', '2 a 3', '4 a 5', 'Más de 5'],
  exportIncomeShare: RANGO_PORCENTAJE,
  mainDestination: ['CAN', 'MERCOSUR', 'Norteamérica', 'Europa', 'Asia', 'Otros'],
  gdpExpectation: EXPECTATIVA,
  inflationExpectation: EXPECTATIVA,
  exchangeRateExpectation: EXPECTATIVA,
  companyExportsExpectation: ['Aumentarán significativamente', 'Aumentarán moderadamente', 'Estables', 'Disminuirán moderadamente', 'Disminuirán significativamente'],
  marketAnalysisFrequency: ['Nunca', 'Ocasionalmente', 'Semestralmente', 'Trimestralmente', 'Permanentemente'],
  accessModality: ['Venta directa', 'Distribuidores', 'Representantes comerciales', 'Marketplace internacional', 'Trading company', 'Otro'],
  valueAddedShare: RANGO_PORCENTAJE,
  bestTradeAgreement: ['CAN', 'MERCOSUR', 'SGP', 'ACE', 'Otro'],
  usesTariffPreferences: ['Sí', 'Parcialmente', 'No'],
  mainExportBarrier: ['Costos logísticos', 'Transporte', 'Aranceles', 'Barreras técnicas', 'Certificaciones', 'Falta de financiamiento', 'Disponibilidad de divisas', 'Regulaciones', 'Falta de información comercial'],
  mainCompetitiveAdvantage: ['Precio', 'Calidad', 'Innovación', 'Marca', 'Certificaciones', 'Servicio', 'Sostenibilidad'],
  mainCompetitiveWeakness: ['Costos', 'Logística', 'Financiamiento', 'Tecnología', 'Capital humano', 'Certificaciones', 'Acceso a mercados'],
  fxShortageImpact: ['Mucho', 'Moderadamente', 'Poco', 'Nada'],
  mainFinancingSource: ['Recursos propios', 'Bancos', 'Cooperativas', 'Inversionistas', 'Organismos internacionales'],
  highestImpactMeasure: ['Simplificación aduanera', 'Acceso a divisas', 'Estabilidad regulatoria', 'Incentivos a exportación', 'Mejora logística', 'Promoción comercial internacional', 'Financiamiento exportador'],
};

const RADIO_FIELDS = [
  'plansNewMarkets', 'attendedTradeFairs', 'plansTradePromotion', 'hasCertifications',
  'investedLast12m', 'willInvestNext12m',
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

// Texto libre opcional: los "Otro (especifique)" y las razones para invertir o no.
const TEXT_FIELDS = [
  'exportSectorOther', 'mainDestinationOther', 'accessModalityOther', 'certificationsOther',
  'bestTradeAgreementOther', 'reasonToInvest', 'reasonNotToInvest',
];

// Preguntas de varias opciones: cada opción es una columna 0/1.
const CHECKBOX_FIELDS = {
  certifications: ['ISO', 'Orgánica', 'Comercio Justo', 'HACCP', 'Otras'],
  instruments: ['Acuerdos comerciales internacionales', 'Sistema Generalizado de Preferencias (SGP)', 'Régimen de Reintegro Arancelario', 'Comercializadoras internacionales', 'Regulaciones regionales', 'Ninguno'],
  regulations: ['Control de cambios', 'Restricciones a las exportaciones', 'Medidas no arancelarias', 'Impuestos a la exportación', 'Incertidumbre regulatoria', 'Procedimientos aduaneros complejos'],
};

const textoOpcional = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().max(150, 'Máximo 150 caracteres').optional().nullable(),
);
const textoRazon = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().max(255, 'Máximo 255 caracteres').optional().nullable(),
);

const shape = {
  year: z.coerce.number().int().min(2000).max(2100),
  semester: z.coerce.number().int().min(1).max(2),
};
Object.entries(OPCIONES).forEach(([campo, opciones]) => {
  shape[campo] = z.enum(opciones, { message: 'Selecciona una opción' });
});
RADIO_FIELDS.forEach((campo) => {
  shape[campo] = z.enum(SI_NO, { message: 'Selecciona una opción' });
});
SCALE_FIELDS.forEach((campo) => {
  shape[campo] = z.coerce.number().int().min(1, 'Selecciona un valor de 1 a 5').max(5, 'Selecciona un valor de 1 a 5');
});
TEXT_FIELDS.forEach((campo) => {
  shape[campo] = campo.startsWith('reason') ? textoRazon : textoOpcional;
});
Object.keys(CHECKBOX_FIELDS).forEach((campo) => {
  shape[campo] = z.array(z.enum(CHECKBOX_FIELDS[campo])).optional().default([]);
});

// "Otro" exige especificar; "hasta 2" en instrumentos y regulaciones;
// "Ninguno" no se combina con otras opciones.
const OTROS = [
  ['exportSector', 'Otro', 'exportSectorOther'],
  ['mainDestination', 'Otros', 'mainDestinationOther'],
  ['accessModality', 'Otro', 'accessModalityOther'],
  ['bestTradeAgreement', 'Otro', 'bestTradeAgreementOther'],
];

const registroSpeSchema = z
  .object(shape)
  .strict()
  .superRefine((d, ctx) => {
    OTROS.forEach(([campo, opcion, texto]) => {
      if (d[campo] === opcion && !d[texto]) {
        ctx.addIssue({ code: 'custom', path: [texto], message: 'Especifica cuál' });
      }
    });
    if (d.hasCertifications === 'Sí' && d.certifications.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['certifications'], message: 'Indica qué certificaciones tiene' });
    }
    if (d.certifications.includes('Otras') && !d.certificationsOther) {
      ctx.addIssue({ code: 'custom', path: ['certificationsOther'], message: 'Especifica cuáles' });
    }
    ['instruments', 'regulations'].forEach((campo) => {
      if (d[campo].length > 2) {
        ctx.addIssue({ code: 'custom', path: [campo], message: 'Marca como máximo 2 opciones' });
      }
    });
    if (d.instruments.includes('Ninguno') && d.instruments.length > 1) {
      ctx.addIssue({ code: 'custom', path: ['instruments'], message: '"Ninguno" no se combina con otras opciones' });
    }
  });

module.exports = {
  registroSpeSchema,
  CHECKBOX_FIELDS,
  OPCIONES,
  RADIO_FIELDS,
  SCALE_FIELDS,
  TEXT_FIELDS,
};
