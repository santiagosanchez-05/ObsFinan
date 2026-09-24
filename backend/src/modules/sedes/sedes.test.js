const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

function token(role) {
  return jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// obtenerEstadisticas lanza 5 queries en paralelo; se responden según el SQL.
function mockConsultas({ sedes, usuarios, registros, porMes, admins }) {
  pool.query.mockImplementation((sql) => {
    if (sql.includes('campus_code')) return Promise.resolve([sedes]);
    if (sql.includes('AS encuestadores')) return Promise.resolve([usuarios]);
    if (sql.includes('mes_numero')) return Promise.resolve([porMes]);
    if (sql.includes('LEFT JOIN data_load')) return Promise.resolve([admins]);
    if (sql.includes('AS datasets')) return Promise.resolve([registros]);
    return Promise.resolve([[]]);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('GET /api/sedes/stats (US15)', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/sedes/stats');
    expect(res.status).toBe(401);
  });

  it('un Admin no puede verlo (solo Superadmin) → 403', async () => {
    const res = await request(app).get('/api/sedes/stats').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('arma el resumen global y el detalle por sede', async () => {
    mockConsultas({
      sedes: [
        { campus_id: 1, campus_name: 'Cochabamba', campus_code: 'CBBA' },
        { campus_id: 2, campus_name: 'La Paz', campus_code: 'LPZ' },
      ],
      usuarios: [
        { campus_id: 1, usuarios: 3, encuestadores: 2, admins: 1 },
        { campus_id: 2, usuarios: 1, encuestadores: 0, admins: 1 },
      ],
      registros: [{ campus_id: 1, registros: 120, datasets: 2, ultima_actividad: new Date('2026-09-01') }],
      porMes: [],
      admins: [
        { user_id: 5, campus_id: 1, first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: null, email: 'ana@test.com', datasets: 2, registros: 120, ultima_actividad: null },
      ],
    });

    const res = await request(app).get('/api/sedes/stats').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.global.usuarios.value).toBe(4);
    expect(res.body.global.registros.value).toBe(120);
    expect(res.body.global.datasets.value).toBe(2);
    expect(res.body.resumen).toHaveLength(2);
  });

  it('cuenta las cargas verificadas y pendientes (todo lo no eliminado)', async () => {
    mockConsultas({ sedes: [], usuarios: [], registros: [], porMes: [], admins: [] });

    await request(app).get('/api/sedes/stats').set('Authorization', `Bearer ${token('superadmin')}`);

    const sqlRegistros = pool.query.mock.calls.map(([sql]) => sql).filter((sql) => sql.includes('data_load'));
    expect(sqlRegistros.length).toBeGreaterThan(0);
    for (const sql of sqlRegistros) {
      expect(sql).toContain('dl.status != 0');
      expect(sql).not.toContain('dl.status = 1');
    }
  });

  it('si la BD falla responde 500', async () => {
    pool.query.mockRejectedValue(new Error('BD caída'));

    const res = await request(app).get('/api/sedes/stats').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(500);
  });
});
