// backend/src/modules/spe/spe.encuestador.validation.js
// Kevin Alanes — US66. Validación de la encuesta SPE que llena el encuestador.
const { z } = require("zod");

// Opciones de los selects (las mismas que usa el formulario SPE)
const OPCIONES = {
  department: ["Santa Cruz", "La Paz", "Cochabamba"],
  exportSector: [
    "Agroindustria",
    "Alimentos",
    "Manufactura",
    "Software y Servicios",
    "Construcción",
    "Químico",
    "Textiles",
    "Otro",
  ],
  companySize: ["Micro", "Pequeña", "Mediana", "Grande"],
  // ⚠️ yearsExporting es ENUM en la BD, no número
  yearsExporting: ["Menos de 5", "6 a 10", "11 a 20", "Más de 20"],
  marketsServed: ["1", "2 a 3", "4 a 5", "Más de 5"],
  exportIncomeShare: [
    "Menos del 25%",
    "26% al 50%",
    "51% al 75%",
    "Más del 75%",
  ],
  mainDestination: [
    "CAN",
    "MERCOSUR",
    "Norteamérica",
    "Europa",
    "Asia",
    "Otros",
  ],
  gdpExpectation: [
    "Aumentará significativamente",
    "Aumentará moderadamente",
    "Estable",
    "Disminuirá moderadamente",
    "Disminuirá significativamente",
  ],
  inflationExpectation: [
    "Aumentará significativamente",
    "Aumentará moderadamente",
    "Estable",
    "Disminuirá moderadamente",
    "Disminuirá significativamente",
  ],
  exchangeRateExpectation: [
    "Aumentará significativamente",
    "Aumentará moderadamente",
    "Estable",
    "Disminuirá moderadamente",
    "Disminuirá significativamente",
  ],
  companyExportsExpectation: [
    "Aumentarán significativamente",
    "Aumentarán moderadamente",
    "Estables",
    "Disminuirán moderadamente",
    "Disminuirán significativamente",
  ],
  marketAnalysisFrequency: [
    "Nunca",
    "Ocasionalmente",
    "Semestralmente",
    "Trimestralmente",
    "Permanentemente",
  ],
  accessModality: [
    "Venta directa",
    "Distribuidores",
    "Representantes comerciales",
    "Marketplace internacional",
    "Trading company",
    "Otro",
  ],
  valueAddedShare: ["Menos del 25%", "26% al 50%", "51% al 75%", "Más del 75%"],
  mainExportBarrier: [
    "Costos logísticos",
    "Transporte",
    "Aranceles",
    "Barreras técnicas",
    "Certificaciones",
    "Falta de financiamiento",
    "Disponibilidad de divisas",
    "Regulaciones",
    "Falta de información comercial",
  ],
  fxShortageImpact: ["Mucho", "Moderadamente", "Poco", "Nada"],
  mainFinancingSource: [
    "Recursos propios",
    "Bancos",
    "Cooperativas",
    "Inversionistas",
    "Organismos internacionales",
  ],
};

const RADIO_FIELDS = [
  "plansNewMarkets",
  "attendedTradeFairs",
  "plansTradePromotion",
  "hasCertifications",
  "usesTariffPreferences",
  "investedLast12m",
  "willInvestNext12m",
];

const SCALE_FIELDS = [
  "boliviaEconomyScore",
  "companyEconomyScore",
  "exportSectorScore",
  "expansionPriorityScore",
  "priceScore",
  "qualityScore",
  "innovationScore",
  "valueAddedScore",
  "deadlinesScore",
  "customerServiceScore",
  "sustainabilityScore",
  "intlLogisticsScore",
  "intlTransportScore",
  "customsClearanceScore",
  "logisticsCostsScore",
  "logisticsInfrastructureScore",
  "tradeFacilitationScore",
  "financingAccessScore",
  "businessLiquidityScore",
  "fxAvailabilityScore",
  "legalCertaintyScore",
  "regulatoryStabilityScore",
  "institutionalTransparencyScore",
  "policyPredictabilityScore",
  "macroStabilityScore",
  "fxAccessScore",
  "financingScore",
  "legalCertaintyInvestmentScore",
  "simplerProceduresScore",
  "newTradeAgreementsScore",
  "logisticsImprovementScore",
  "newMarketsScore",
];

const TEXT_FIELDS = [
  "bestTradeAgreement",
  "mainCompetitiveAdvantage",
  "mainCompetitiveWeakness",
  "highestImpactMeasure",
  "reasonToInvest",
  "reasonNotToInvest",
];

const CHECKBOX_FIELDS = {
  certifications: ["ISO", "Orgánica", "Comercio justo", "HACCP", "Otra"],
  instruments: [
    "Acuerdos comerciales",
    "SGP",
    "Devolución de aranceles",
    "Trading companies",
    "Normativa regional",
    "Ninguno",
  ],
  regulations: [
    "Control de cambios",
    "Restricciones a la exportación",
    "Medidas no arancelarias",
    "Impuestos a la exportación",
    "Incertidumbre regulatoria",
    "Trámites aduaneros complejos",
  ],
};

const stringOptional = z.string().trim().max(1000).optional().nullable();

const shape = {
  eventId: z.coerce.number().int().positive("El evento es obligatorio"),
  year: z.coerce.number().int().min(2000).max(2100),
  semester: z.coerce.number().int().min(1).max(2),
};

Object.entries(OPCIONES).forEach(([campo, opciones]) => {
  shape[campo] = z.enum(opciones).optional().nullable();
});
RADIO_FIELDS.forEach((campo) => {
  shape[campo] = z.enum(["Sí", "No"]).optional().nullable();
});
SCALE_FIELDS.forEach((campo) => {
  shape[campo] = z.coerce.number().int().min(1).max(5).optional().nullable();
});
TEXT_FIELDS.forEach((campo) => {
  shape[campo] = stringOptional;
});
Object.keys(CHECKBOX_FIELDS).forEach((campo) => {
  shape[campo] = z.array(z.enum(CHECKBOX_FIELDS[campo])).optional().default([]);
});

const encuestaSpeSchema = z.object(shape).strict();

module.exports = { encuestaSpeSchema };
