const { z } = require('zod');

const uploadIcaMetaSchema = z.object({
  communityId: z.coerce.number().int().positive('Falta seleccionar la comuna'),
  quarter: z.coerce.number().int().min(1).max(4, { message: 'Trimestre inválido (1-4)' }),
  year: z.coerce.number().int().min(2019).max(new Date().getFullYear()),
});

// Encabezados esperados en la fila 2 del Excel: las 32 preguntas del
// instrumento ICA, texto exacto, mismo orden que INSTRUMENTO ICA.docx.
// Ya NO incluye "Comuna" como columna — el archivo entero es de UNA sola
// comuna, elegida en el formulario de carga, no por fila.
const ENCABEZADOS_ESPERADOS = [
  '¿Usted contribuye económicamente en su hogar y/o participa en la toma de decisiones financieras?',
  '¿Qué edad tiene?',
  '¿Cuál es su sexo?',
  'Nivel de instrucción más alto alcanzado',
  '¿Para qué sirve un seguro?',
  '¿En cuáles de las siguientes actividades necesita un seguro obligatorio?',
  "¿Conoce el significado del término 'tomador' en un seguro?",
  "¿Conoce el significado del término 'siniestro'?",
  "¿Conoce el significado del término 'prima'?",
  "¿Conoce el significado del término 'franquicia'?",
  "¿Conoce el significado del término 'exclusiones'?",
  '¿Quién puede vender un seguro?',
  '¿A quién perjudica más el fraude en el seguro?',
  '¿A dónde acudiría en primer lugar si tuviera que hacer una reclamación?',
  '¿De qué forma ha adquirido sus conocimientos en materia de seguros?',
  '¿Qué método considera más adecuado para mejorar sus conocimientos sobre seguros?',
  '¿Quién cree usted que se ocupa de mejorar la educación en materia de seguros de la población?',
  '¿Qué haría para protegerse y proteger a su familia y patrimonio de un posible riesgo?',
  '¿Cuál es su gasto anual estimado en seguros?',
  '¿Qué está haciendo para preparar su jubilación?',
  '¿Qué nivel de cultura aseguradora considera que tiene?',
  '¿Actualmente tiene un seguro de vida?',
  '¿Cuánto tiempo ha tenido su seguro de vida?',
  '¿Cuál fue la razón principal por la que decidió adquirir un seguro de vida?',
  '¿Con qué frecuencia revisa o actualiza su póliza de seguro de vida?',
  '¿Cambiaría de aseguradora o de plan?',
  '¿Qué tan satisfecho está con su seguro de vida actual?',
  '¿Qué tan probable es que considere adquirir un seguro de vida en el futuro?',
  '¿Cuáles son las principales barreras que le impiden contratar un seguro de vida?',
  '¿En qué medida confía en las aseguradoras en Bolivia?',
  '¿Qué porcentaje de sus ingresos estaría dispuesto a destinar mensualmente para contratarlo?',
  '¿Qué factor considera más importante al momento de decidir si contratar un seguro de vida?',
];

// Opciones válidas por pregunta — mismo texto exacto que los ENUM de la BDD.
const OPCIONES = {
  siNo: ['Sí', 'No'],
  sexo: ['Mujer', 'Hombre'],
  educacion: ['Bachiller', 'Técnico', 'Universidad', 'Postgrado'],
  q05: ['Para proteger sus bienes y/o su familia ante sucesos inciertos', 'Para la cobertura de todos mis riesgos', 'Para evitar posibles situaciones de riesgo', 'Para penalizar a los causantes de un siniestro', 'Para mantener “como nuevos” los bienes'],
  // q06: pendiente de confirmar con el cliente si es multi-selección; por ahora, opción única.
  q06: ['Contratar una hipoteca', 'Conducir un vehículo', 'Viajar en transporte público', 'Comprarse un vehículo nuevo', 'Cazar', 'Trabajar en construcción', 'Viajar'],
  q07: ['La persona que contrata el seguro', 'El profesional que asesora sobre seguros', 'La persona que vende el seguro', 'La persona que vende seguros de otro por comisión', 'La entidad aseguradora'],
  q08: ['El perjuicio producido por una persona a otra u otras', 'El conjunto de bienes asegurados', 'La cantidad que recibe el asegurado cuando se produce un siniestro', 'El contrato de seguro', 'La cantidad que recibe la aseguradora del asegurado'],
  q09: ['La aportación económica que realiza el asegurado a la compañía de seguros', 'El nivel de protección de los bienes', 'La cantidad máxima que va a pagar la aseguradora en caso de siniestro', 'El valor del bien que ha sufrido el siniestro', 'El periodo de tiempo inicial durante el cual no tienen efecto las coberturas'],
  q10: ['Una cantidad por la cual el asegurado es su propio asegurador', 'El organismo de inspección y supervisión de la actividad aseguradora', 'El valor del bien asegurado', 'La entidad aseguradora', 'La entidad autorizada para el ejercicio de la actividad aseguradora'],
  q11: ['Los riesgos que no están incluidos en las coberturas de la póliza', 'Los riesgos a los que un hogar está expuesto', 'Los trabajos previos a la realización de un contrato de seguros', 'Las condiciones particulares del contrato de seguro', 'El conjunto de bienes no asegurados'],
  q12: ['Una notaría', 'Una corredora de seguros', 'Una compañía de seguros', 'Un comparador de seguros por Internet', 'Una asociación de consumidores', 'Un Banco'],
  q13: ['A la persona que vendió el seguro', 'A la compañía aseguradora', 'Al defraudador', 'A la compañía de seguro y a los asegurados', 'A las administraciones públicas'],
  q14: ['Al Banco Central de Bolivia', 'A la propia compañía de seguros', 'Al Centro de atención al usuario y consumidor', 'A la Autoridad de Fiscalización y Control de Pensiones y Seguros (APS)', 'A la Policía'],
  q15: ['No sabe de seguros o sabe muy poco', 'Con la experiencia personal', 'A través de su profesión', 'En la escuela o el instituto', 'A través de estudios superiores'],
  q16: ['No le interesa mejorarlos', 'Asistir a cursos especializados', 'Preguntar a familiares o amistades', 'Consultar materiales diversos (Internet, libros u otros)', 'Ninguno de los anteriores le merece garantías'],
  q17: ['Los usuarios de seguros', 'Asociaciones o colegios profesionales y/o compañías aseguradoras', 'Los organismos reguladores del sector del seguro', 'Asociaciones de usuarios de seguros', 'No se ocupa nadie'],
  q18: ['Evitar al máximo cualquier situación de riesgo', 'Ahorrar para subsanar los posibles daños futuros', 'Contratar un seguro', 'Instalar una alarma en casa', 'No hacer nada y asumir las consecuencias'],
  q19: ['Nada', 'Menos de Bs. 2,500', 'Entre Bs. 2,501 y Bs. 7,000', 'Más de Bs. 7,000', 'Solo lo necesario para seguros obligatorios'],
  q20: ['Está aportando a la gestora para cobrar una pensión', 'Está ahorrando', 'Está comprando bienes (joyas, cuadros, vivienda u otros)', 'Está aporte a la gestora y a su vez cuenta con un plan de jubilación privado', 'No se lo ha planteado todavía'],
  q21: ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'],
  q23: ['Menos de un año', 'Entre 1 y 3 años', 'Más de 3 años'],
  q24: ['Protección financiera para mi familia', 'Requerimiento de una entidad financiera', 'Consejo de un familiar o amigo', 'Otra (Especifique)'],
  q25: ['Anualmente', 'Cada dos años', 'Rara vez', 'Nunca'],
  q26: ['Sí, por mejores beneficios', 'Sí, por menor costo', 'No, estoy satisfecho con mi seguro actual', 'No lo sé'],
  q27: ['Muy insatisfecho', 'Insatisfecho', 'Neutral (ni satisfecho ni insatisfecho)', 'Satisfecho', 'Muy satisfecho'],
  q28: ['Muy improbable', 'Poco probable', 'Neutral (ni probable ni improbable)', 'Probable', 'Muy probable'],
  q29: ['Falta de información sobre seguros de vida', 'Falta de confianza en las aseguradoras', 'Precio elevado', 'No lo considero necesario', 'No tengo ingresos suficientes'],
  q30: ['Nada', 'Poco', 'Neutral', 'Bastante', 'Mucho'],
  q31: ['No pagaría nada', 'Hasta un 2% de mis ingresos', 'Entre 3% y 5% de mis ingresos', 'Entre 6% y 10% de mis ingresos', 'Más del 10% de mis ingresos'],
  q32: ['Precio', 'Beneficios y coberturas', 'Confianza en la aseguradora', 'Experiencia previa con seguros', 'Recomendación de un familiar o amigo'],
};

// Valida UNA fila del Excel = UNA entrevista completa (32 respuestas).
const filaEncuestaIcaSchema = z.object({
  filaExcel: z.number(), // no se valida, solo se propaga para reportar errores

  q01ContributesFinancially: z.enum(OPCIONES.siNo),
  q02Age: z.coerce.number().int().min(0).max(120),
  q03Sex: z.enum(OPCIONES.sexo),
  q04EducationLevel: z.enum(OPCIONES.educacion),
  q05InsurancePurpose: z.enum(OPCIONES.q05),
  q06MandatoryInsuranceActivity: z.enum(OPCIONES.q06),
  q07MeaningPolicyholder: z.enum(OPCIONES.q07),
  q08MeaningClaim: z.enum(OPCIONES.q08),
  q09MeaningPremium: z.enum(OPCIONES.q09),
  q10MeaningDeductible: z.enum(OPCIONES.q10),
  q11MeaningExclusions: z.enum(OPCIONES.q11),
  q12WhoSellsInsurance: z.enum(OPCIONES.q12),
  q13WhoIsHarmedByFraud: z.enum(OPCIONES.q13),
  q14WhereToFileClaim: z.enum(OPCIONES.q14),
  q15HowAcquiredKnowledge: z.enum(OPCIONES.q15),
  q16BestMethodToImprove: z.enum(OPCIONES.q16),
  q17WhoImprovesEducation: z.enum(OPCIONES.q17),
  q18HowToProtectYourself: z.enum(OPCIONES.q18),
  q19AnnualInsuranceSpend: z.enum(OPCIONES.q19),
  q20RetirementPreparation: z.enum(OPCIONES.q20),
  q21InsuranceCultureLevel: z.enum(OPCIONES.q21),

  q22HasLifeInsurance: z.enum(OPCIONES.siNo),

  // Condicionales a q22 = 'Sí'
  q23LifeInsuranceDuration: z.enum(OPCIONES.q23).optional(),
  q24ReasonAcquired: z.enum(OPCIONES.q24).optional(),
  q25PolicyReviewFrequency: z.enum(OPCIONES.q25).optional(),
  q26WouldSwitchProvider: z.enum(OPCIONES.q26).optional(),
  q27SatisfactionCurrentPolicy: z.enum(OPCIONES.q27).optional(),

  // Condicionales a q22 = 'No'
  q28LikelihoodFuturePurchase: z.enum(OPCIONES.q28).optional(),
  q29BarriersToPurchase: z.enum(OPCIONES.q29).optional(),

  q30TrustInInsurers: z.enum(OPCIONES.q30),
  q31IncomePercentageWilling: z.enum(OPCIONES.q31),
  q32MostImportantFactor: z.enum(OPCIONES.q32),
}).superRefine((data, ctx) => {
  const tieneSeguroVida = data.q22HasLifeInsurance === 'Sí';
  const camposSoloSiTiene = ['q23LifeInsuranceDuration', 'q24ReasonAcquired', 'q25PolicyReviewFrequency', 'q26WouldSwitchProvider', 'q27SatisfactionCurrentPolicy'];
  const camposSoloSiNoTiene = ['q28LikelihoodFuturePurchase', 'q29BarriersToPurchase'];

  const [requeridos, prohibidos] = tieneSeguroVida
    ? [camposSoloSiTiene, camposSoloSiNoTiene]
    : [camposSoloSiNoTiene, camposSoloSiTiene];

  for (const campo of requeridos) {
    if (data[campo] === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: 'Campo obligatorio según la pregunta 22' });
    }
  }
  for (const campo of prohibidos) {
    if (data[campo] !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: 'Campo no corresponde según la pregunta 22' });
    }
  }
});


//  ICARegisterPage.jsx (US18).


const registroIcaSchema = z.object({
  communityId: z.coerce.number().int().positive('Falta seleccionar la comuna'),
  quarter: z.coerce.number().int().min(1).max(4, { message: 'Trimestre inválido (1-4)' }),
  year: z.coerce.number().int().min(2019).max(new Date().getFullYear()),
  conocimiento: z.coerce.number().min(0).max(100),
  uso: z.coerce.number().min(0).max(100),
  educacion: z.coerce.number().min(0).max(100),
  prevision: z.coerce.number().min(0).max(100),
  icaHombres: z.coerce.number().min(0).max(100),
  icaMujeres: z.coerce.number().min(0).max(100),
});

module.exports = { uploadIcaMetaSchema, ENCABEZADOS_ESPERADOS, filaEncuestaIcaSchema, registroIcaSchema };