const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const token = (role, userId = 1) =>
  jwt.sign({ userId, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('US56 — Mis eventos del encuestador (GET /api/events/mis-eventos)', () => {
  it('devuelve únicamente los eventos asignados y activos del encuestador autenticado', async () => {
    const mockEventos = [
      {
        id: 10,
        campusId: 1,
        sede: 'Cochabamba',
        titulo: 'Feria de Educación Financiera CBBA',
        fecha: '2026-04-10',
        hora: '09:00:00',
        modalidad: 1,
        cuposDisponibles: 50,
        lugar: 'Campus Univalle Tiquipaya',
        descripcion: 'Relevamiento en feria',
        enlaceExterno: null,
        has_ica: 1,
        has_spe: 0,
      },
      {
        id: 11,
        campusId: 1,
        sede: 'Cochabamba',
        titulo: 'Encuentro Exportador SOCOMEX',
        fecha: '2026-04-15',
        hora: '14:30:00',
        modalidad: 3,
        cuposDisponibles: 30,
        lugar: 'Auditorio Central',
        descripcion: 'Encuestas a empresas',
        enlaceExterno: 'https://zoom.us/test',
        has_ica: 1,
        has_spe: 1,
      },
    ];

    pool.query.mockResolvedValueOnce([mockEventos]);

    const res = await request(app)
      .get('/api/events/mis-eventos')
      .set('Authorization', `Bearer ${token('encuestador', 5)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: 10,
        titulo: 'Feria de Educación Financiera CBBA',
        has_ica: 1,
        has_spe: 0,
      })
    );
    expect(res.body[1]).toEqual(
      expect.objectContaining({
        id: 11,
        titulo: 'Encuentro Exportador SOCOMEX',
        has_ica: 1,
        has_spe: 1,
      })
    );

    // Verifica que se pasó el ID del encuestador en la query
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [, params] = pool.query.mock.calls[0];
    expect(params).toContain(5);
  });

  it('devuelve un arreglo vacío si el encuestador no tiene eventos asignados', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/events/mis-eventos')
      .set('Authorization', `Bearer ${token('encuestador', 99)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('maneja errores de servidor retornando 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('Fallo de BD'));

    const res = await request(app)
      .get('/api/events/mis-eventos')
      .set('Authorization', `Bearer ${token('encuestador', 5)}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/no se pudieron cargar los eventos/i);
  });
});
