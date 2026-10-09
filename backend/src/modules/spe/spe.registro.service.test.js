const { construirRespuesta, CAMPOS, CHECKBOX_COLUMNAS } = require('./spe.registro.service');
const { registroSpeSchema, CHECKBOX_FIELDS, OPCIONES, RADIO_FIELDS, SCALE_FIELDS, TEXT_FIELDS } = require('./spe.registro.validation');

// Una encuesta completa y válida con las opciones exactas del Word / de la BD.
function encuestaValida(cambios = {}) {
  const datos = { year: 2026, semester: 2 };
  Object.entries(OPCIONES).forEach(([campo, opciones]) => { datos[campo] = opciones[0]; });
  RADIO_FIELDS.forEach((campo) => { datos[campo] = 'No'; });
  SCALE_FIELDS.forEach((campo) => { datos[campo] = 3; });
  datos.exportSector = 'Textiles';
  datos.mainDestination = 'CAN';
  datos.accessModality = 'Distribuidores';
  datos.bestTradeAgreement = 'CAN';
  return { ...datos, ...cambios };
}

describe('construirRespuesta', () => {
  it('usa los nombres de columnas reales de spe_survey_response', () => {
    const { columnas, valores } = construirRespuesta({
      exportSector: 'Textiles',
      certifications: ['ISO', 'Orgánica'],
      instruments: ['Acuerdos comerciales internacionales', 'Sistema Generalizado de Preferencias (SGP)'],
      regulations: ['Control de cambios', 'Medidas no arancelarias'],
      legalCertaintyInvestmentScore: 4,
      certificationsOther: 'BRC',
    });

    expect(columnas).toEqual(expect.arrayContaining([
      's1_export_sector', 's4_cert_iso', 's4_cert_organic', 's4_cert_other_text',
      's6_instr_trade_agreements', 's6_instr_sgp', 's6_reg_exchange_controls',
      's6_reg_non_tariff_measures', 's8_legal_certainty_score',
    ]));
    expect(valores[columnas.indexOf('s4_cert_iso')]).toBe(1);
    expect(valores[columnas.indexOf('s4_cert_haccp')]).toBe(0);
    expect(valores[columnas.indexOf('s8_legal_certainty_score')]).toBe(4);
    expect(new Set(columnas).size).toBe(columnas.length); // sin columnas repetidas
  });

  it('cada opción de las preguntas de varias opciones tiene su columna', () => {
    Object.entries(CHECKBOX_FIELDS).forEach(([campo, opciones]) => {
      opciones.forEach((opcion) => expect(CHECKBOX_COLUMNAS[campo][opcion]).toMatch(/^s[46]_/));
    });
  });

  it('cada campo del formulario tiene su columna', () => {
    const conColumna = new Set(CAMPOS.map(([campo]) => campo));
    [...Object.keys(OPCIONES), ...RADIO_FIELDS, ...SCALE_FIELDS, ...TEXT_FIELDS].forEach((campo) => {
      expect(conColumna.has(campo)).toBe(true);
    });
  });
});

describe('registroSpeSchema', () => {
  it('acepta una encuesta completa con las opciones del Word', () => {
    expect(registroSpeSchema.safeParse(encuestaValida()).success).toBe(true);
  });

  it('rechaza opciones que no existen en la BD (antes se guardaban vacías)', () => {
    for (const [campo, valor] of [
      ['exportIncomeShare', '25% - 50%'],
      ['marketAnalysisFrequency', 'Mensualmente'],
      ['companyExportsExpectation', 'Aumentarán'],
      ['yearsExporting', '8'],
      ['mainDestination', 'Brasil'],
    ]) {
      expect(registroSpeSchema.safeParse(encuestaValida({ [campo]: valor })).success).toBe(false);
    }
  });

  it('"Otro" exige especificar cuál', () => {
    const r = registroSpeSchema.safeParse(encuestaValida({ exportSector: 'Otro' }));
    expect(r.success).toBe(false);
    expect(r.error.flatten().fieldErrors.exportSectorOther).toBeDefined();
    expect(registroSpeSchema.safeParse(encuestaValida({ exportSector: 'Otro', exportSectorOther: 'Joyería' })).success).toBe(true);
  });

  it('permite como máximo 2 instrumentos y 2 regulaciones, y "Ninguno" va solo', () => {
    const tres = CHECKBOX_FIELDS.regulations.slice(0, 3);
    expect(registroSpeSchema.safeParse(encuestaValida({ regulations: tres })).success).toBe(false);
    expect(registroSpeSchema.safeParse(encuestaValida({ instruments: ['Ninguno', 'Regulaciones regionales'] })).success).toBe(false);
    expect(registroSpeSchema.safeParse(encuestaValida({ instruments: ['Ninguno'] })).success).toBe(true);
  });

  it('si tiene certificaciones, pide cuáles', () => {
    expect(registroSpeSchema.safeParse(encuestaValida({ hasCertifications: 'Sí' })).success).toBe(false);
    expect(registroSpeSchema.safeParse(encuestaValida({ hasCertifications: 'Sí', certifications: ['ISO'] })).success).toBe(true);
  });
});
