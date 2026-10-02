const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 1, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('US51 — Listado de convocatorias (GET /api/convocatorias)', () => {
  it('el superadmin puede ver convocatorias de todas las sedes', async () => {
    const mockRows = [
      {
        convocation_id: 1,
        campus_id: 1,
        title: 'Convocatoria CBBA 2026',
        start_date: '2026-03-01',
        end_date: '2026-03-30',
        description: 'Búsqueda de encuestadores',
        status: 1,
        created_at: '2026-02-15T10:00:00.000Z',
        campus_name: 'Cochabamba',
        total_postulantes: 5,
        esta_abierta: 1,
      },
      {
        convocation_id: 2,
        campus_id: 2,
        title: 'Convocatoria LPZ 2026',
        start_date: '2026-01-01',
        end_date: '2026-01-31',
        description: 'Convocatoria pasada',
        status: 1,
        created_at: '2026-01-01T10:00:00.000Z',
        campus_name: 'La Paz',
        total_postulantes: 12,
        esta_abierta: 0,
      },
    ];

    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app)
      .get('/api/convocatorias')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: 1,
        titulo: 'Convocatoria CBBA 2026',
        sede: 'Cochabamba',
        totalPostulantes: 5,
        estaAbierta: true,
        estado: 'abierta',
      })
    );
    expect(res.body[1]).toEqual(
      expect.objectContaining({
        id: 2,
        titulo: 'Convocatoria LPZ 2026',
        sede: 'La Paz',
        totalPostulantes: 12,
        estaAbierta: false,
        estado: 'cerrada',
      })
    );
  });

  it('el admin solo consulta convocatorias de su propia sede', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/convocatorias')
      .set('Authorization', `Bearer ${token('admin', 3)}`);

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = pool.query.mock.calls[0];
    expect(sqlQuery).toContain('c.campus_id = ?');
    expect(params[0]).toBe(0); // ESTADO_POSTULANTE.ELIMINADO (JOIN)
    expect(params[1]).toBe(1); // ESTADO.ACTIVO (convocatoria)
    expect(params[2]).toBe(3);
  });

  it('permite filtrar por estado (abiertas / cerradas) y término de búsqueda', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/convocatorias?estado=abiertas&busqueda=estudiantes')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    const [sqlQuery, params] = pool.query.mock.calls[0];
    expect(sqlQuery).toContain('CURDATE() BETWEEN c.start_date AND c.end_date');
    expect(sqlQuery).toContain('(c.title LIKE ? OR c.description LIKE ?)');
    expect(params).toContain('%estudiantes%');
  });

  it('devuelve lista vacía si no hay registros', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/convocatorias')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna 500 en caso de fallo inesperado de la base de datos', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB Connection lost'));

    const res = await request(app)
      .get('/api/convocatorias')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/no se pudo obtener/i);
  });
});
