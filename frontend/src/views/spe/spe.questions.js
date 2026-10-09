// Encuesta Única Integrada SOCOMEX–SOCIFIN (8 secciones). Las opciones son
// EXACTAMENTE las del instrumento y las de los ENUM de spe_survey_response:
// si se cambia una, hay que cambiarla también en el backend
// (spe.registro.validation.js) y en la BD.
//
// Tipos: select, radio, scale (1 a 5), checkbox (varias), text.
// `showIf(valores)`: el campo solo aparece (y solo se valida) si se cumple.
// `max`: máximo de opciones marcadas en un checkbox.

const SI_NO = ['Sí', 'No'];
const RANGO_PORCENTAJE = ['Menos del 25%', '26% al 50%', '51% al 75%', 'Más del 75%'];
const EXPECTATIVA = [
  'Aumentará significativamente',
  'Aumentará moderadamente',
  'Estable',
  'Disminuirá moderadamente',
  'Disminuirá significativamente',
];

export const SPE_SECTIONS = [
  {
    id: 'perfil',
    number: '01',
    title: 'Caracterización empresarial',
    description: 'Identifica la empresa y sus principales características exportadoras.',
    fields: [
      { name: 'department', label: 'Departamento', type: 'select', options: ['Santa Cruz', 'La Paz', 'Cochabamba'] },
      { name: 'exportSector', label: 'Sector exportador', type: 'select', options: ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'] },
      { name: 'exportSectorOther', label: '¿Qué otro sector?', type: 'text', placeholder: 'Especifique el sector', showIf: (v) => v.exportSector === 'Otro' },
      { name: 'companySize', label: 'Tamaño de empresa', type: 'select', options: ['Micro', 'Pequeña', 'Mediana', 'Grande'] },
      { name: 'yearsExporting', label: 'Años exportando', type: 'select', options: ['Menos de 5', '6 a 10', '11 a 20', 'Más de 20'] },
      { name: 'marketsServed', label: 'Número de mercados internacionales atendidos', type: 'select', options: ['1', '2 a 3', '4 a 5', 'Más de 5'] },
      { name: 'exportIncomeShare', label: '¿Qué porcentaje de sus ingresos proviene de exportaciones?', type: 'select', options: RANGO_PORCENTAJE },
      { name: 'mainDestination', label: '¿Cuál es su principal mercado de destino?', type: 'select', options: ['CAN', 'MERCOSUR', 'Norteamérica', 'Europa', 'Asia', 'Otros'] },
      { name: 'mainDestinationOther', label: '¿Qué otro mercado?', type: 'text', placeholder: 'Especifique el mercado', showIf: (v) => v.mainDestination === 'Otros' },
    ],
  },
  {
    id: 'expectativas',
    number: '02',
    title: 'Situación económica y expectativas',
    description: 'Escala de 1 (muy mala) a 5 (muy buena) y expectativas para los próximos meses.',
    fields: [
      { name: 'boliviaEconomyScore', label: 'Situación económica actual de Bolivia', type: 'scale' },
      { name: 'companyEconomyScore', label: 'Situación económica de su empresa', type: 'scale' },
      { name: 'exportSectorScore', label: 'Situación del sector exportador', type: 'scale' },
      { name: 'gdpExpectation', label: '¿Cómo espera que evolucione el PIB?', type: 'select', options: EXPECTATIVA },
      { name: 'inflationExpectation', label: '¿Cómo espera que evolucione la inflación?', type: 'select', options: EXPECTATIVA },
      { name: 'exchangeRateExpectation', label: '¿Cómo espera que evolucione el tipo de cambio?', type: 'select', options: EXPECTATIVA },
      { name: 'companyExportsExpectation', label: '¿Cómo espera que evolucionen las exportaciones de su empresa?', type: 'select', options: ['Aumentarán significativamente', 'Aumentarán moderadamente', 'Estables', 'Disminuirán moderadamente', 'Disminuirán significativamente'] },
    ],
  },
  {
    id: 'internacionalizacion',
    number: '03',
    title: 'Internacionalización',
    description: 'Planes de expansión y promoción comercial.',
    fields: [
      { name: 'plansNewMarkets', label: '¿Planea ingresar a nuevos mercados internacionales?', type: 'radio', options: SI_NO },
      { name: 'expansionPriorityScore', label: '¿Qué nivel de prioridad tiene la expansión internacional para su empresa?', type: 'scale' },
      { name: 'marketAnalysisFrequency', label: '¿Con qué frecuencia analiza mercados internacionales?', type: 'select', options: ['Nunca', 'Ocasionalmente', 'Semestralmente', 'Trimestralmente', 'Permanentemente'] },
      { name: 'accessModality', label: '¿Cuál es la principal modalidad utilizada para acceder a mercados internacionales?', type: 'select', options: ['Venta directa', 'Distribuidores', 'Representantes comerciales', 'Marketplace internacional', 'Trading company', 'Otro'] },
      { name: 'accessModalityOther', label: '¿Qué otra modalidad?', type: 'text', placeholder: 'Especifique la modalidad', showIf: (v) => v.accessModality === 'Otro' },
      { name: 'attendedTradeFairs', label: '¿Participó en ferias o misiones comerciales internacionales durante los últimos 12 meses?', type: 'radio', options: SI_NO },
      { name: 'plansTradePromotion', label: '¿Planea participar en actividades de promoción comercial internacional durante los próximos 12 meses?', type: 'radio', options: SI_NO },
    ],
  },
  {
    id: 'competitividad',
    number: '04',
    title: 'Competitividad exportadora',
    description: 'Evalúe su competitividad respecto a competidores internacionales (1 a 5).',
    fields: [
      { name: 'priceScore', label: 'Precio', type: 'scale' },
      { name: 'qualityScore', label: 'Calidad', type: 'scale' },
      { name: 'innovationScore', label: 'Innovación', type: 'scale' },
      { name: 'valueAddedScore', label: 'Valor agregado', type: 'scale' },
      { name: 'deadlinesScore', label: 'Cumplimiento de plazos', type: 'scale' },
      { name: 'customerServiceScore', label: 'Servicio al cliente', type: 'scale' },
      { name: 'sustainabilityScore', label: 'Sostenibilidad', type: 'scale' },
      { name: 'valueAddedShare', label: '¿Qué porcentaje de su oferta exportable posee valor agregado?', type: 'select', options: RANGO_PORCENTAJE },
      { name: 'hasCertifications', label: '¿Su empresa cuenta con certificaciones internacionales?', type: 'radio', options: SI_NO },
      { name: 'certifications', label: '¿Cuáles certificaciones?', type: 'checkbox', options: ['ISO', 'Orgánica', 'Comercio Justo', 'HACCP', 'Otras'], showIf: (v) => v.hasCertifications === 'Sí' },
      { name: 'certificationsOther', label: '¿Qué otras certificaciones?', type: 'text', placeholder: 'Especifique', showIf: (v) => v.hasCertifications === 'Sí' && (v.certifications || []).includes('Otras') },
    ],
  },
  {
    id: 'comercio',
    number: '05',
    title: 'Comercio internacional y acceso a mercados',
    description: 'Acuerdos, barreras y desempeño logístico.',
    fields: [
      { name: 'bestTradeAgreement', label: '¿Qué acuerdo comercial beneficia más a su empresa?', type: 'select', options: ['CAN', 'MERCOSUR', 'SGP', 'ACE', 'Otro'] },
      { name: 'bestTradeAgreementOther', label: '¿Qué otro acuerdo?', type: 'text', placeholder: 'Especifique el acuerdo', showIf: (v) => v.bestTradeAgreement === 'Otro' },
      { name: 'usesTariffPreferences', label: '¿Aprovecha preferencias arancelarias?', type: 'radio', options: ['Sí', 'Parcialmente', 'No'] },
      { name: 'mainExportBarrier', label: 'Principal barrera para exportar', type: 'select', options: ['Costos logísticos', 'Transporte', 'Aranceles', 'Barreras técnicas', 'Certificaciones', 'Falta de financiamiento', 'Disponibilidad de divisas', 'Regulaciones', 'Falta de información comercial'] },
      { name: 'intlLogisticsScore', label: 'Logística internacional', type: 'scale' },
      { name: 'intlTransportScore', label: 'Transporte internacional', type: 'scale' },
      { name: 'customsClearanceScore', label: 'Despacho aduanero', type: 'scale' },
      { name: 'logisticsCostsScore', label: 'Costos logísticos', type: 'scale' },
      { name: 'logisticsInfrastructureScore', label: 'Infraestructura logística', type: 'scale' },
      { name: 'tradeFacilitationScore', label: 'Facilitación del comercio', type: 'scale' },
      { name: 'mainCompetitiveAdvantage', label: '¿Cuál considera que es actualmente la principal ventaja competitiva de su empresa?', type: 'select', options: ['Precio', 'Calidad', 'Innovación', 'Marca', 'Certificaciones', 'Servicio', 'Sostenibilidad'] },
      { name: 'mainCompetitiveWeakness', label: '¿Cuál considera que es actualmente su principal debilidad competitiva?', type: 'select', options: ['Costos', 'Logística', 'Financiamiento', 'Tecnología', 'Capital humano', 'Certificaciones', 'Acceso a mercados'] },
    ],
  },
  {
    id: 'financiamiento',
    number: '06',
    title: 'Condiciones financieras',
    description: 'Acceso a financiamiento, divisas e instrumentos (escala 1 a 5).',
    fields: [
      { name: 'financingAccessScore', label: 'Acceso al financiamiento', type: 'scale' },
      { name: 'businessLiquidityScore', label: 'Liquidez empresarial', type: 'scale' },
      { name: 'fxAvailabilityScore', label: 'Disponibilidad de divisas', type: 'scale' },
      { name: 'fxShortageImpact', label: '¿La escasez de divisas afecta su actividad exportadora?', type: 'select', options: ['Mucho', 'Moderadamente', 'Poco', 'Nada'] },
      { name: 'mainFinancingSource', label: 'Principal fuente de financiamiento', type: 'select', options: ['Recursos propios', 'Bancos', 'Cooperativas', 'Inversionistas', 'Organismos internacionales'] },
      { name: 'instruments', label: '¿Qué instrumento favorece más sus exportaciones? (marque hasta 2)', type: 'checkbox', max: 2, options: ['Acuerdos comerciales internacionales', 'Sistema Generalizado de Preferencias (SGP)', 'Régimen de Reintegro Arancelario', 'Comercializadoras internacionales', 'Regulaciones regionales', 'Ninguno'] },
      { name: 'regulations', label: '¿Cuáles considera actualmente las dos regulaciones más restrictivas para exportar? (marque hasta 2)', type: 'checkbox', max: 2, options: ['Control de cambios', 'Restricciones a las exportaciones', 'Medidas no arancelarias', 'Impuestos a la exportación', 'Incertidumbre regulatoria', 'Procedimientos aduaneros complejos'] },
    ],
  },
  {
    id: 'institucional',
    number: '07',
    title: 'Entorno institucional',
    description: 'Valoración del marco institucional (escala 1 a 5).',
    fields: [
      { name: 'legalCertaintyScore', label: 'Seguridad jurídica', type: 'scale' },
      { name: 'regulatoryStabilityScore', label: 'Estabilidad regulatoria', type: 'scale' },
      { name: 'institutionalTransparencyScore', label: 'Transparencia institucional', type: 'scale' },
      { name: 'policyPredictabilityScore', label: 'Predictibilidad de las políticas relacionadas con comercio exterior', type: 'scale' },
      { name: 'highestImpactMeasure', label: '¿Qué medida tendría mayor impacto en la mejora de la competitividad exportadora?', type: 'select', options: ['Simplificación aduanera', 'Acceso a divisas', 'Estabilidad regulatoria', 'Incentivos a exportación', 'Mejora logística', 'Promoción comercial internacional', 'Financiamiento exportador'] },
    ],
  },
  {
    id: 'inversion',
    number: '08',
    title: 'Inversión y perspectiva futura',
    description: 'Inversiones y qué factores mejorarían sus expectativas (escala 1 a 5).',
    fields: [
      { name: 'investedLast12m', label: '¿Realizó inversiones en los últimos 12 meses?', type: 'radio', options: SI_NO },
      { name: 'willInvestNext12m', label: '¿Realizará inversiones en los próximos 12 meses?', type: 'radio', options: SI_NO },
      { name: 'reasonToInvest', label: 'Razón principal para invertir', type: 'text', placeholder: 'Describa brevemente', showIf: (v) => v.willInvestNext12m === 'Sí' },
      { name: 'reasonNotToInvest', label: 'Razón principal para no invertir', type: 'text', placeholder: 'Describa brevemente', showIf: (v) => v.willInvestNext12m === 'No' },
      { name: 'macroStabilityScore', label: 'Estabilidad macroeconómica', type: 'scale' },
      { name: 'fxAccessScore', label: 'Acceso a divisas', type: 'scale' },
      { name: 'financingScore', label: 'Financiamiento', type: 'scale' },
      { name: 'legalCertaintyInvestmentScore', label: 'Seguridad jurídica', type: 'scale' },
      { name: 'simplerProceduresScore', label: 'Simplificación de trámites', type: 'scale' },
      { name: 'newTradeAgreementsScore', label: 'Nuevos acuerdos comerciales', type: 'scale' },
      { name: 'logisticsImprovementScore', label: 'Mejora logística', type: 'scale' },
      { name: 'newMarketsScore', label: 'Apertura de nuevos mercados', type: 'scale' },
    ],
  },
];
