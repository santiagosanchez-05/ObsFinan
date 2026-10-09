const { calcularIndicesRespuesta, puntuar } = require('./spe.indices.service');

describe('calcularIndicesRespuesta', () => {
  it('normaliza escalas 1-5 a 0-100', () => {
    expect(puntuar(1, 'scale')).toBe(0);
    expect(puntuar(3, 'scale')).toBe(50);
    expect(puntuar(5, 'scale')).toBe(100);
  });

  it('calcula los cuatro índices con sus indicadores disponibles', () => {
    const respuesta = {
      s3_expansion_priority_score: 5,
      s3_market_analysis_frequency: 'Permanentemente',
      s3_plans_new_markets: 'Sí',
      s3_attended_trade_fairs: 'Sí',
      s3_plans_trade_promotion: 'Sí',
      s4_price_score: 5,
      s5_intl_logistics_score: 5,
      s6_financing_access_score: 5,
      s7_legal_certainty_score: 5,
      s2_bolivia_economy_score: 5,
      s2_gdp_expectation: 'Aumentará significativamente',
      s8_macro_stability_score: 5,
    };

    expect(calcularIndicesRespuesta(respuesta)).toEqual({
      iee: 100,
      ice: 100,
      iie: 100,
      icie: 100,
    });
  });

  it('promedia solo respuestas válidas y disponibles', () => {
    const indices = calcularIndicesRespuesta({
      s3_expansion_priority_score: 1,
      s3_plans_new_markets: 'No',
      s4_price_score: 3,
      s6_financing_access_score: null,
      s2_gdp_expectation: 'Estable',
    });

    expect(indices.iee).toBe(0);
    expect(indices.ice).toBe(50);
    expect(indices.iie).toBeNull();
    expect(indices.icie).toBe(50);
  });

  it('ignora valores inválidos sin producir puntajes falsos', () => {
    expect(calcularIndicesRespuesta({
      s4_price_score: 9,
      s3_plans_new_markets: 'Tal vez',
    })).toEqual({
      iee: null,
      ice: null,
      iie: null,
      icie: null,
    });
  });
});
