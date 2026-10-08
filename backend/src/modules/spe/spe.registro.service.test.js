const { construirRespuesta } = require('./spe.registro.service');

describe('construirRespuesta', () => {
  it('usa los nombres de columnas definidos para las respuestas SPE', () => {
    const { columnas } = construirRespuesta({
      companyName: 'Empresa de prueba',
      certifications: ['ISO', 'Orgánica'],
      instruments: ['Acuerdos comerciales', 'SGP'],
      regulations: ['Control de cambios', 'Medidas no arancelarias'],
      legalCertaintyInvestmentScore: 4,
    });

    expect(columnas).toEqual(expect.arrayContaining([
      's4_cert_iso',
      's4_cert_organic',
      's6_instr_trade_agreements',
      's6_instr_sgp',
      's6_reg_exchange_controls',
      's6_reg_non_tariff_measures',
      's8_legal_certainty_score',
    ]));
    expect(columnas).not.toContain('s1_company_name');
    expect(columnas).not.toContain('s4_certifications_iso');
    expect(columnas).not.toContain('s8_legal_certainty_investment_score');
  });
});
