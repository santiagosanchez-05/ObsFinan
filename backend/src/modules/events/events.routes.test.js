const request = require('supertest');
const jwt = require('jsonwebtoken');

// Andamiaje Sprint 2: verifica que cada ruta de eventos exista y tenga la
// protección correcta. NO prueba la lógica — cada encargado agrega sus tests
// en su propio archivo (events.<funcionalidad>.test.js).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const app = require('../../app');

const token = (role) => jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Rutas de eventos — acceso', () => {
  it.each([
    ['get', '/api/events'],
    ['get', '/api/events/1'],
  ])('%s %s es pública (agenda de eventos)', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect([401, 403]).not.toContain(res.status);
  });

  it.each([
    ['get', '/api/events/mis-eventos'],
    ['post', '/api/events'],
    ['patch', '/api/events/1'],
    ['delete', '/api/events/1'],
    ['get', '/api/events/1/encuestadores'],
    ['post', '/api/events/1/encuestadores'],
    ['delete', '/api/events/1/encuestadores/2'],
  ])('%s %s sin sesión responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it.each([
    ['post', '/api/events', 'encuestador'],
    ['patch', '/api/events/1', 'encuestador'],
    ['post', '/api/events/1/encuestadores', 'encuestador'],
    ['get', '/api/events/mis-eventos', 'admin'],
  ])('%s %s con rol %s responde 403', async (metodo, ruta, rol) => {
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token(rol)}`);
    expect(res.status).toBe(403);
  });

  it('"mis-eventos" no se confunde con un id de evento', async () => {
    const res = await request(app).get('/api/events/mis-eventos').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).not.toBe(403);
    expect(res.body.error ?? '').not.toContain('US47');
  });

  it('Admin y Superadmin pueden gestionar eventos', async () => {
    for (const rol of ['admin', 'superadmin']) {
      const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token(rol)}`);
      expect([401, 403]).not.toContain(res.status);
    }
  });
});
