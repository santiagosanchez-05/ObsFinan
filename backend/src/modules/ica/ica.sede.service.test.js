// Consultas del servicio ICA con y sin sede (Santiago — US65): con campusId
// filtran por esa sede; con null (Superadmin) no filtran.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const pool = require('../../config/db');
const icaService = require('./ica.service');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('obtenerComunidadesPorSede', () => {
  it('con sede filtra por ella', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await icaService.obtenerComunidadesPorSede(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('co.campus_id = ?');
    expect(params).toEqual([1]);
  });

  it('sin sede (Superadmin) trae todas', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await icaService.obtenerComunidadesPorSede(null);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('co.campus_id = ?');
    expect(params).toEqual([]);
  });
});

describe('obtenerHistorialIca', () => {
  it('sin sede no filtra por campus', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([[]]);
    await icaService.obtenerHistorialIca({ campusId: null });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('c.campus_id = ?');
    expect(params).toEqual([1]);
  });

  it('con sede filtra por campus', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([[]]);
    await icaService.obtenerHistorialIca({ campusId: 2 });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('c.campus_id = ?');
    expect(params).toEqual([1, 2]);
  });
});

describe('obtenerDetalleArchivoIca', () => {
  const carga = [[{ data_load_id: 5, source_type: 2, file_name: 'a.xlsx', status: 2, created_at: new Date(), first_name: 'Ana', paternal_last_name: 'Paz' }]];
  const respuestas = [[{ survey_response_id: 1, community_id: 9, community_name: 'Sopocachi', campus_id: 2, year: 2026, quarter: 1 }]];

  it('el Admin de otra sede no lo encuentra', async () => {
    pool.query.mockResolvedValueOnce(carga).mockResolvedValueOnce(respuestas);
    await expect(icaService.obtenerDetalleArchivoIca({ campusId: 1, dataLoadId: 5 })).rejects.toThrow('ARCHIVO_NO_ENCONTRADO');
  });

  it('el Superadmin lo ve aunque sea de otra sede', async () => {
    pool.query.mockResolvedValueOnce(carga).mockResolvedValueOnce(respuestas);
    const detalle = await icaService.obtenerDetalleArchivoIca({ campusId: null, dataLoadId: 5 });
    expect(detalle.archivo.comunidad).toBe('Sopocachi');
  });
});

describe('registrarRegistroIndividual: validación de la comuna', () => {
  it('el Superadmin puede usar una comuna de cualquier sede', async () => {
    pool.query.mockResolvedValueOnce([[]]); // comuna inexistente: corta antes de abrir la transacción
    await expect(
      icaService.registrarRegistroIndividual({ communityId: 9, year: 2026, quarter: 1, userId: 7, campusId: null, rol: 'superadmin' }),
    ).rejects.toThrow('COMUNIDAD_NO_ENCONTRADA');
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('campus_id = ?');
    expect(params).toEqual([9]);
  });

  it('el Admin solo puede usar comunas de su sede', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await expect(
      icaService.registrarRegistroIndividual({ communityId: 9, year: 2026, quarter: 1, userId: 7, campusId: 1, rol: 'admin' }),
    ).rejects.toThrow('COMUNIDAD_NO_ENCONTRADA');
    expect(pool.query.mock.calls[0][1]).toEqual([9, 1]);
  });
});
