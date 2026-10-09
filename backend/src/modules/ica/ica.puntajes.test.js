const { puntuarEncuesta, icaPonderado, PESOS_ICA } = require('./ica.puntajes');

const CONOCIMIENTO_CORRECTO = {
  q05InsurancePurpose: 'Para proteger sus bienes y/o su familia ante sucesos inciertos',
  q06MandatoryInsuranceActivity: 'Conducir un vehículo',
  q07MeaningPolicyholder: 'La persona que contrata el seguro',
  q08MeaningClaim: 'El perjuicio producido por una persona a otra u otras',
  q09MeaningPremium: 'La aportación económica que realiza el asegurado a la compañía de seguros',
  q10MeaningDeductible: 'Una cantidad por la cual el asegurado es su propio asegurador',
  q11MeaningExclusions: 'Los riesgos que no están incluidos en las coberturas de la póliza',
  q12WhoSellsInsurance: 'Un Banco',
  q13WhoIsHarmedByFraud: 'A la compañía de seguro y a los asegurados',
  q14WhereToFileClaim: 'A la propia compañía de seguros',
};

describe('Metodología del ICA (4 dimensiones)', () => {
  it('los pesos suman 1 (25/15/20/40)', () => {
    expect(Object.values(PESOS_ICA).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('todas las de conocimiento correctas -> Conocimiento = 100', () => {
    expect(puntuarEncuesta(CONOCIMIENTO_CORRECTO).conocimiento).toBe(100);
  });

  it('una respuesta incorrecta de conocimiento vale 0 (no se puntúa por posición)', () => {
    const r = puntuarEncuesta({ ...CONOCIMIENTO_CORRECTO, q07MeaningPolicyholder: 'La entidad aseguradora' });
    expect(r.conocimiento).toBe(90);
  });

  it('P1 a P4 no puntúan', () => {
    const r = puntuarEncuesta({ q01ContributesFinancially: 'Sí', q02Age: 40, q03Sex: 'Mujer', q04EducationLevel: 'Postgrado' });
    expect(r).toEqual({ conocimiento: null, educacion: null, prevision: null, uso: null, ica: null });
  });

  it('sin seguro de vida y confianza máxima -> Uso y confianza = 50', () => {
    const r = puntuarEncuesta({
      q22HasLifeInsurance: 'No',
      q28LikelihoodFuturePurchase: 'Muy probable',
      q30TrustInInsurers: 'Mucho',
      q31IncomePercentageWilling: 'Más del 10% de mis ingresos',
    });
    expect(r.uso).toBe(50);
  });

  it('con seguro de vida promedia P23 a P27 con el 100 por tenerlo', () => {
    const r = puntuarEncuesta({
      q22HasLifeInsurance: 'Sí',
      q23LifeInsuranceDuration: 'Más de 3 años',
      q24ReasonAcquired: 'Protección financiera para mi familia',
      q25PolicyReviewFrequency: 'Anualmente',
      q26WouldSwitchProvider: 'No, estoy satisfecho con mi seguro actual',
      q27SatisfactionCurrentPolicy: 'Muy satisfecho',
    });
    expect(r.uso).toBe(100);
  });

  it('P29 y P32 son descriptivas y no cambian el puntaje', () => {
    const base = puntuarEncuesta({ q30TrustInInsurers: 'Poco' });
    const con = puntuarEncuesta({ q30TrustInInsurers: 'Poco', q29BarriersToPurchase: 'Precio elevado', q32MostImportantFactor: 'Precio' });
    expect(con).toEqual(base);
  });

  it('el ICA es el promedio ponderado y reparte el peso si falta una dimensión', () => {
    expect(icaPonderado({ conocimiento: 100, educacion: 0, prevision: 0, uso: 0 })).toBeCloseTo(25);
    expect(icaPonderado({ conocimiento: 100, educacion: null, prevision: null, uso: null })).toBe(100);
    expect(icaPonderado({})).toBeNull();
  });
});
