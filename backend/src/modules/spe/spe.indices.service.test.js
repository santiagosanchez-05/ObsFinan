const { calcularIndicesRespuesta, puntuar } = require('./spe.indices.service');

describe('calcularIndicesRespuesta', () => {
  it('normaliza escalas 1-5 a 0-100', () => {
    expect(puntuar(1, 'scale')).toBe(0);
    expect(puntuar(3, 'scale')).toBe(50);
    expect(puntuar(5, 'scale')).toBe(100);
    expect(puntuar(9, 'scale')).toBeNull();
  });

  it('cada índice usa las preguntas de su sección', () => {
    const indices = calcularIndicesRespuesta({
      // IEE: expectativas (sección II)
      s2_bolivia_economy_score: 5,
      s2_gdp_expectation: 'Aumentará significativamente',
      // ICE: competitividad (sección IV)
      s4_price_score: 1,
      s4_has_certifications: 'No',
      // IIE: internacionalización
      s3_plans_new_markets: 'Sí',
      s1_markets_served: 'Más de 5',
      // ICIE: clima de inversión
      s6_financing_access_score: 3,
      s8_will_invest_next_12m: 'Sí',
    });

    expect(indices).toEqual({ iee: 100, ice: 0, iie: 100, icie: 75 });
  });

  it('inflación y tipo de cambio están invertidos: que suban baja el IEE', () => {
    expect(calcularIndicesRespuesta({ s2_inflation_expectation: 'Aumentará significativamente' }).iee).toBe(0);
    expect(calcularIndicesRespuesta({ s2_exchange_rate_expectation: 'Disminuirá significativamente' }).iee).toBe(100);
    expect(calcularIndicesRespuesta({ s2_gdp_expectation: 'Aumentará significativamente' }).iee).toBe(100);
  });

  it('una empresa neutral en todo da 50 en los cuatro índices', () => {
    const indices = calcularIndicesRespuesta({
      s2_bolivia_economy_score: 3,
      s2_inflation_expectation: 'Estable',
      s4_quality_score: 3,
      s3_expansion_priority_score: 3,
      s3_market_analysis_frequency: 'Semestralmente',
      s7_legal_certainty_score: 3,
    });
    expect(indices).toEqual({ iee: 50, ice: 50, iie: 50, icie: 50 });
  });

  it('las escalas de "qué mejoraría sus expectativas" (s8_*_score) no entran en ningún índice', () => {
    expect(calcularIndicesRespuesta({ s8_macro_stability_score: 5, s8_new_markets_score: 1 })).toEqual({
      iee: null,
      ice: null,
      iie: null,
      icie: null,
    });
  });

  it('ignora valores fuera de las opciones sin producir puntajes falsos', () => {
    expect(calcularIndicesRespuesta({
      s4_price_score: 9,
      s3_plans_new_markets: 'Tal vez',
      s3_market_analysis_frequency: 'Mensualmente',
    })).toEqual({ iee: null, ice: null, iie: null, icie: null });
  });
});
