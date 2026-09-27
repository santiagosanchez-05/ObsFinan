const request = require('supertest');
const jwt = require('jsonwebtoken');

// Andamiaje Sprint 2: verifica la protección de /api/encuestas/mias.
// Kevin Prieto agrega sus tests de lógica en encuestas.test.js.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const app = require('../../app');

const token = (role) => jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('GET /api/encuestas/mias — acceso', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/encuestas/mias');
    expect(res.status).toBe(401);
  });

  it('solo el encuestador tiene "mis encuestas"', async () => {
    const res = await request(app).get('/api/encuestas/mias').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('el encuestador sí puede entrar', async () => {
    const res = await request(app).get('/api/encuestas/mias').set('Authorization', `Bearer ${token('encuestador')}`);
    expect([401, 403]).not.toContain(res.status);
  });
});
