const request = require('supertest');
const jwt = require('jsonwebtoken');

// Andamiaje Sprint 2: verifica que cada ruta de convocatorias exista y tenga
// la protección correcta. NO prueba la lógica — cada encargado agrega sus
// tests en su propio archivo (convocatorias.<funcionalidad>.test.js).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const app = require('../../app');

const token = (role) => jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Rutas de convocatorias — acceso', () => {
  it.each([
    ['get', '/api/convocatorias/abiertas'],
    ['post', '/api/convocatorias/1/postulaciones'],
  ])('%s %s es pública (formulario de postulación)', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect([401, 403]).not.toContain(res.status);
  });

  it.each([
    ['get', '/api/convocatorias'],
    ['post', '/api/convocatorias'],
    ['get', '/api/convocatorias/1/postulaciones'],
    ['patch', '/api/convocatorias/postulaciones/1'],
  ])('%s %s sin sesión responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it.each([
    ['get', '/api/convocatorias'],
    ['post', '/api/convocatorias'],
    ['patch', '/api/convocatorias/postulaciones/1'],
  ])('%s %s con rol encuestador responde 403', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(403);
  });
});
