const request = require('supertest');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const POSTULACION_VALIDA = {
  first_name: 'Mateo',
  paternal_last_name: 'Flores',
  maternal_last_name: 'Gutiérrez',
  email: 'mateo.flores@ejemplo.bo',
  phone: '77889900',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('US52 — Postulación pública (GET /api/convocatorias/abiertas y POST /api/convocatorias/:id/postulaciones)', () => {
  it('GET /api/convocatorias/abiertas es público y retorna las vigentes', async () => {
    const mockAbiertas = [
      {
        id: 1,
        campusId: 1,
        sede: 'Cochabamba',
        titulo: 'Convocatoria Abierta CBBA',
        descripcion: 'Postúlate aquí',
        fechaInicio: '2026-03-01',
        fechaFin: '2026-03-31',
      },
    ];
    pool.query.mockResolvedValueOnce([mockAbiertas]);

    const res = await request(app).get('/api/convocatorias/abiertas');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAbiertas);
  });

  it('POST /:id/postulaciones registra una postulación válida con 201', async () => {
    pool.query
      .mockResolvedValueOnce([[{ convocation_id: 1, esta_abierta: 1 }]]) // check abierta
      .mockResolvedValueOnce([[]]) // check duplicados (ninguno)
      .mockResolvedValueOnce([{ insertId: 45 }]); // INSERT applicant

    const res = await request(app)
      .post('/api/convocatorias/1/postulaciones')
      .send(POSTULACION_VALIDA);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/éxito/i),
        applicantId: 45,
      })
    );
  });

  it('POST /:id/postulaciones rechaza datos inválidos con 400', async () => {
    const res = await request(app)
      .post('/api/convocatorias/1/postulaciones')
      .send({
        first_name: '',
        paternal_last_name: '',
        email: 'correo-no-valido',
        phone: '12',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválidos/i);
    expect(res.body.detalles).toBeDefined();
  });

  it('POST /:id/postulaciones retorna 404 si la convocatoria no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]); // no encontrada

    const res = await request(app)
      .post('/api/convocatorias/999/postulaciones')
      .send(POSTULACION_VALIDA);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no existe/i);
  });

  it('POST /:id/postulaciones rechaza postulación si la convocatoria está cerrada con 400', async () => {
    pool.query.mockResolvedValueOnce([[{ convocation_id: 1, esta_abierta: 0 }]]); // cerrada

    const res = await request(app)
      .post('/api/convocatorias/1/postulaciones')
      .send(POSTULACION_VALIDA);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no se encuentra abierta/i);
  });

  it('POST /:id/postulaciones rechaza correos duplicados con 409', async () => {
    pool.query
      .mockResolvedValueOnce([[{ convocation_id: 1, esta_abierta: 1 }]]) // check abierta
      .mockResolvedValueOnce([[{ applicant_id: 12 }]]); // ya existe duplicado

    const res = await request(app)
      .post('/api/convocatorias/1/postulaciones')
      .send(POSTULACION_VALIDA);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya existe una postulación/i);
  });
});
