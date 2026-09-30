const { parsearFiltrosSpe } = require('./spe.filtros');

describe('parsearFiltrosSpe (US33)', () => {
  test('convierte y devuelve todos los filtros válidos (ejemplo del contrato)', () => {
    expect(
      parsearFiltrosSpe({ year: '2026', semester: '1', department: 'La Paz', sector: 'Textiles', size: 'Mediana' }),
    ).toEqual({ year: 2026, semester: 1, department: 'La Paz', sector: 'Textiles', size: 'Mediana' });
  });

  test('sin query, o con query vacía, no aplica ningún filtro', () => {
    expect(parsearFiltrosSpe()).toEqual({});
    expect(parsearFiltrosSpe(undefined)).toEqual({});
    expect(parsearFiltrosSpe(null)).toEqual({});
    expect(parsearFiltrosSpe({})).toEqual({});
  });

  test('un valor vacío (como manda el selector "Todos") no se incluye', () => {
    expect(parsearFiltrosSpe({ year: '', semester: '', department: '', sector: '', size: '' })).toEqual({});
  });

  test('acepta filtros parciales', () => {
    expect(parsearFiltrosSpe({ semester: '2' })).toEqual({ semester: 2 });
    expect(parsearFiltrosSpe({ sector: 'Alimentos', size: 'Grande' })).toEqual({ sector: 'Alimentos', size: 'Grande' });
  });

  test.each([
    ['año con letras', { year: '2026abc' }],
    ['año corto', { year: '26' }],
    ['año decimal', { year: '2026.5' }],
    ['año negativo', { year: '-2026' }],
    ['año fuera de rango', { year: '1999' }],
    ['semestre 0', { semester: '0' }],
    ['semestre 3', { semester: '3' }],
    ['semestre con texto', { semester: 'uno' }],
    ['departamento inexistente', { department: 'Tarija' }],
    ['sector inexistente', { sector: 'Minería' }],
    ['tamaño inexistente', { size: 'Gigante' }],
  ])('ignora un valor inválido: %s', (_nombre, query) => {
    expect(parsearFiltrosSpe(query)).toEqual({});
  });

  test('ignora los inválidos pero conserva los válidos de la misma consulta', () => {
    expect(parsearFiltrosSpe({ year: '2026', semester: '9', department: 'Tarija', size: 'Micro' })).toEqual({ year: 2026, size: 'Micro' });
  });

  test('ignora parámetros repetidos (arreglos) y objetos', () => {
    expect(parsearFiltrosSpe({ year: ['2025', '2026'], department: ['La Paz'], sector: { $ne: 'x' } })).toEqual({});
  });

  test('ignora claves que no son del contrato', () => {
    expect(parsearFiltrosSpe({ exportSector: 'Textiles', companySize: 'Micro', quarter: '1', foo: 'bar' })).toEqual({});
  });

  test('recorta espacios alrededor de los valores', () => {
    expect(parsearFiltrosSpe({ year: ' 2026 ', department: ' La Paz ' })).toEqual({ year: 2026, department: 'La Paz' });
  });

  test('el valor debe coincidir exacto con el ENUM (mayúsculas y tildes)', () => {
    expect(parsearFiltrosSpe({ department: 'la paz' })).toEqual({});
    expect(parsearFiltrosSpe({ sector: 'Quimico' })).toEqual({});
  });

  test.each(['Santa Cruz', 'La Paz', 'Cochabamba'])('acepta el departamento %s', (department) => {
    expect(parsearFiltrosSpe({ department })).toEqual({ department });
  });

  test.each(['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'])(
    'acepta el sector %s',
    (sector) => {
      expect(parsearFiltrosSpe({ sector })).toEqual({ sector });
    },
  );

  test.each(['Micro', 'Pequeña', 'Mediana', 'Grande'])('acepta el tamaño %s', (size) => {
    expect(parsearFiltrosSpe({ size })).toEqual({ size });
  });

});