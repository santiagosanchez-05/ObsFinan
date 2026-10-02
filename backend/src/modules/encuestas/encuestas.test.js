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

describe('US61 — Estado de mis encuestas (GET /api/encuestas/mias)', () => {
  it('retorna las encuestas del encuestador distinguiendo estados pendiente, aprobada y rechazada', async () => {
    const mockEncuestas = [
      {
        id: 101,
        moduloId: 1, // ICA
        tipoCargaId: 1, // Individual
        nombreArchivo: 'Entrevista ICA - Q2 2026',
        totalRegistros: 1,
        statusId: 1, // PENDIENTE
        motivoRechazo: null,
        fechaRevision: null,
        fechaCarga: '2026-04-01T10:00:00.000Z',
        revisorNombre: null,
        revisorApellido: null,
      },
      {
        id: 102,
        moduloId: 2, // SPE
        tipoCargaId: 1,
        nombreArchivo: 'Encuesta SPE Empresa ABC',
        totalRegistros: 1,
        statusId: 2, // APROBADA
        motivoRechazo: null,
        fechaRevision: '2026-04-02T15:00:00.000Z',
        fechaCarga: '2026-04-01T12:00:00.000Z',
        revisorNombre: 'Santiago',
        revisorApellido: 'Superadmin',
      },
      {
        id: 103,
        moduloId: 1,
        tipoCargaId: 2,
        nombreArchivo: 'lote_ica_abril.xlsx',
        totalRegistros: 25,
        statusId: 3, // RECHAZADA
        motivoRechazo: 'Datos incompletos en la sección de ingresos',
        fechaRevision: '2026-04-03T09:00:00.000Z',
        fechaCarga: '2026-04-02T08:00:00.000Z',
        revisorNombre: 'Ana',
        revisorApellido: 'Admin',
      },
    ];

    pool.query.mockResolvedValueOnce([mockEncuestas]);

    const res = await request(app)
      .get('/api/encuestas/mias')
      .set('Authorization', `Bearer ${token('encuestador', 7)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    // 1. Pendiente
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: 101,
        modulo: 'ICA',
        estado: 'pendiente',
        status: 1,
        revisadoPor: null,
        motivoRechazo: null,
      })
    );

    // 2. Aprobada
    expect(res.body[1]).toEqual(
      expect.objectContaining({
        id: 102,
        modulo: 'SPE',
        estado: 'aprobada',
        status: 2,
        revisadoPor: 'Santiago Superadmin',
      })
    );

    // 3. Rechazada
    expect(res.body[2]).toEqual(
      expect.objectContaining({
        id: 103,
        modulo: 'ICA',
        estado: 'rechazada',
        status: 3,
        motivoRechazo: 'Datos incompletos en la sección de ingresos',
        revisadoPor: 'Ana Admin',
      })
    );

    // Asegura que la consulta filtró por el userId del encuestador
    const [, params] = pool.query.mock.calls[0];
    expect(params).toContain(7);
  });

  it('permite filtrar por módulo y por estado', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/encuestas/mias?modulo=SPE&estado=pendiente')
      .set('Authorization', `Bearer ${token('encuestador', 7)}`);

    expect(res.status).toBe(200);
    const [sqlQuery, params] = pool.query.mock.calls[0];
    expect(sqlQuery).toContain('dl.module = ?');
    expect(sqlQuery).toContain('dl.status = ?');
    expect(params).toContain(2); // MODULO.SPE
    expect(params).toContain(1); // ESTADO_CARGA.PENDIENTE
  });

  it('devuelve un arreglo vacío si el encuestador no ha cargado encuestas', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/encuestas/mias')
      .set('Authorization', `Bearer ${token('encuestador', 99)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('maneja fallos de base de datos retornando 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('Fallo de conexión'));

    const res = await request(app)
      .get('/api/encuestas/mias')
      .set('Authorization', `Bearer ${token('encuestador', 7)}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/no se pudieron cargar/i);
  });
});
