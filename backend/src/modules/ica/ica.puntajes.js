// Metodología del ICA (Índice de Calidad Aseguradora) — definida por el equipo
// (el cliente no entregó fórmulas). Ver la guía de cálculo de Liz.
//
// - Cada respuesta se convierte a un puntaje de 0 a 100 con las tablas de abajo.
// - Dimensión = promedio de sus preguntas (las vacías no cuentan).
// - ICA = promedio ponderado de las 4 dimensiones (PESOS_ICA).
// - P1 a P4 son filtros (no puntúan); P29 y P32 son descriptivas.
// Los puntajes y pesos viven SOLO aquí para poder ajustarlos sin tocar la lógica.

const PESOS_ICA = {
  conocimiento: 0.25,
  educacion: 0.15,
  prevision: 0.2,
  uso: 0.4, // "Uso y confianza": seguro de vida (P22–P27) + confianza (P28, P30, P31)
};

// Conocimiento: la correcta vale 100, el resto 0 (P12 y P14 tienen más de una válida).
const CORRECTAS = {
  q05InsurancePurpose: { 'Para proteger sus bienes y/o su familia ante sucesos inciertos': 100 },
  q06MandatoryInsuranceActivity: { 'Conducir un vehículo': 100 },
  q07MeaningPolicyholder: { 'La persona que contrata el seguro': 100 },
  q08MeaningClaim: { 'El perjuicio producido por una persona a otra u otras': 100 },
  q09MeaningPremium: { 'La aportación económica que realiza el asegurado a la compañía de seguros': 100 },
  q10MeaningDeductible: { 'Una cantidad por la cual el asegurado es su propio asegurador': 100 },
  q11MeaningExclusions: { 'Los riesgos que no están incluidos en las coberturas de la póliza': 100 },
  q12WhoSellsInsurance: {
    'Una corredora de seguros': 100,
    'Una compañía de seguros': 100,
    'Un Banco': 100,
  },
  q13WhoIsHarmedByFraud: { 'A la compañía de seguro y a los asegurados': 100 },
  q14WhereToFileClaim: {
    'A la propia compañía de seguros': 100,
    'A la Autoridad de Fiscalización y Control de Pensiones y Seguros (APS)': 50,
  },
};

const ESCALAS = {
  // Educación aseguradora
  q15HowAcquiredKnowledge: {
    'No sabe de seguros o sabe muy poco': 0,
    'Con la experiencia personal': 50,
    'A través de su profesión': 75,
    'En la escuela o el instituto': 75,
    'A través de estudios superiores': 100,
  },
  q16BestMethodToImprove: {
    'No le interesa mejorarlos': 0,
    'Ninguno de los anteriores le merece garantías': 0,
    'Preguntar a familiares o amistades': 25,
    'Consultar materiales diversos (Internet, libros u otros)': 75,
    'Asistir a cursos especializados': 100,
  },
  q17WhoImprovesEducation: {
    'No se ocupa nadie': 0,
    'Los usuarios de seguros': 50,
    'Asociaciones de usuarios de seguros': 75,
    'Asociaciones o colegios profesionales y/o compañías aseguradoras': 100,
    'Los organismos reguladores del sector del seguro': 100,
  },
  // Previsión
  q18HowToProtectYourself: {
    'No hacer nada y asumir las consecuencias': 0,
    'Instalar una alarma en casa': 25,
    'Evitar al máximo cualquier situación de riesgo': 50,
    'Ahorrar para subsanar los posibles daños futuros': 50,
    'Contratar un seguro': 100,
  },
  q19AnnualInsuranceSpend: {
    Nada: 0,
    'Solo lo necesario para seguros obligatorios': 25,
    'Menos de Bs. 2,500': 50,
    'Entre Bs. 2,501 y Bs. 7,000': 75,
    'Más de Bs. 7,000': 100,
  },
  q20RetirementPreparation: {
    'No se lo ha planteado todavía': 0,
    'Está ahorrando': 50,
    'Está comprando bienes (joyas, cuadros, vivienda u otros)': 50,
    'Está aportando a la gestora para cobrar una pensión': 75,
    'Está aporte a la gestora y a su vez cuenta con un plan de jubilación privado': 100,
  },
  q21InsuranceCultureLevel: { 'Muy bajo': 0, Bajo: 25, Medio: 50, Alto: 75, 'Muy alto': 100 },
  // Uso — seguro de vida (solo si P22 = "Sí")
  q23LifeInsuranceDuration: { 'Menos de un año': 33, 'Entre 1 y 3 años': 67, 'Más de 3 años': 100 },
  q24ReasonAcquired: {
    'Requerimiento de una entidad financiera': 25,
    'Consejo de un familiar o amigo': 50,
    'Otra (Especifique)': 50,
    'Protección financiera para mi familia': 100,
  },
  q25PolicyReviewFrequency: { Nunca: 0, 'Rara vez': 33, 'Cada dos años': 67, Anualmente: 100 },
  q26WouldSwitchProvider: {
    'No lo sé': 0,
    'Sí, por menor costo': 50,
    'Sí, por mejores beneficios': 75,
    'No, estoy satisfecho con mi seguro actual': 100,
  },
  q27SatisfactionCurrentPolicy: {
    'Muy insatisfecho': 0,
    Insatisfecho: 25,
    'Neutral (ni satisfecho ni insatisfecho)': 50,
    Satisfecho: 75,
    'Muy satisfecho': 100,
  },
  // Uso — confianza
  q28LikelihoodFuturePurchase: {
    'Muy improbable': 0,
    'Poco probable': 25,
    'Neutral (ni probable ni improbable)': 50,
    Probable: 75,
    'Muy probable': 100,
  },
  q30TrustInInsurers: { Nada: 0, Poco: 25, Neutral: 50, Bastante: 75, Mucho: 100 },
  q31IncomePercentageWilling: {
    'No pagaría nada': 0,
    'Hasta un 2% de mis ingresos': 25,
    'Entre 3% y 5% de mis ingresos': 50,
    'Entre 6% y 10% de mis ingresos': 75,
    'Más del 10% de mis ingresos': 100,
  },
};

const DIMENSIONES = {
  conocimiento: Object.keys(CORRECTAS),
  educacion: ['q15HowAcquiredKnowledge', 'q16BestMethodToImprove', 'q17WhoImprovesEducation'],
  prevision: ['q18HowToProtectYourself', 'q19AnnualInsuranceSpend', 'q20RetirementPreparation', 'q21InsuranceCultureLevel'],
};
const SEGURO_DE_VIDA = ['q23LifeInsuranceDuration', 'q24ReasonAcquired', 'q25PolicyReviewFrequency', 'q26WouldSwitchProvider', 'q27SatisfactionCurrentPolicy'];
const CONFIANZA = ['q28LikelihoodFuturePurchase', 'q30TrustInInsurers', 'q31IncomePercentageWilling'];

const vacio = (v) => v === null || v === undefined || v === '';

function promedio(valores) {
  const validos = valores.filter((v) => v !== null && v !== undefined);
  return validos.length ? validos.reduce((t, v) => t + v, 0) / validos.length : null;
}

const redondear = (v) => (v === null ? null : Number(v.toFixed(2)));

// Puntaje 0–100 de una respuesta; null si está vacía o no está en la tabla.
function puntuarRespuesta(campo, valor) {
  if (vacio(valor)) return null;
  if (CORRECTAS[campo]) return CORRECTAS[campo][String(valor)] ?? 0;
  const tabla = ESCALAS[campo];
  if (!tabla) return null;
  return tabla[String(valor)] ?? null;
}

// "Uso y confianza" = mitad seguro de vida + mitad confianza.
function puntuarUso(r) {
  let seguro = null;
  if (r.q22HasLifeInsurance === 'No') seguro = 0;
  else if (r.q22HasLifeInsurance === 'Sí') {
    seguro = promedio([100, ...SEGURO_DE_VIDA.map((c) => puntuarRespuesta(c, r[c]))]);
  }
  const confianza = promedio(CONFIANZA.map((c) => puntuarRespuesta(c, r[c])));
  if (seguro === null) return confianza;
  if (confianza === null) return seguro;
  return 0.5 * seguro + 0.5 * confianza;
}

// ICA ponderado a partir de las 4 dimensiones (si falta una, su peso se reparte).
function icaPonderado(dimensiones) {
  let suma = 0;
  let pesos = 0;
  Object.entries(PESOS_ICA).forEach(([dim, peso]) => {
    const valor = dimensiones[dim];
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return;
    suma += peso * Number(valor);
    pesos += peso;
  });
  return pesos ? suma / pesos : null;
}

// respuestas: objeto con las claves camelCase de CAMPOS_ENCUESTA.
function puntuarEncuesta(respuestas) {
  const dimensiones = {
    conocimiento: promedio(DIMENSIONES.conocimiento.map((c) => puntuarRespuesta(c, respuestas[c]))),
    educacion: promedio(DIMENSIONES.educacion.map((c) => puntuarRespuesta(c, respuestas[c]))),
    prevision: promedio(DIMENSIONES.prevision.map((c) => puntuarRespuesta(c, respuestas[c]))),
    uso: puntuarUso(respuestas),
  };
  return {
    conocimiento: redondear(dimensiones.conocimiento),
    educacion: redondear(dimensiones.educacion),
    prevision: redondear(dimensiones.prevision),
    uso: redondear(dimensiones.uso),
    ica: redondear(icaPonderado(dimensiones)),
  };
}

module.exports = { PESOS_ICA, CORRECTAS, ESCALAS, puntuarRespuesta, puntuarEncuesta, icaPonderado };
