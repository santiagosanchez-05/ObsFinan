const request = require('supertest');
const jwt = require('jsonwebtoken');

// Andamiaje Sprint 2: verifica que cada ruta del SPE exista y tenga la
// protección correcta. NO prueba la lógica — cada encargado agrega sus tests
// en su propio archivo (spe.<funcionalidad>.test.js).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const app = require('../../app');

const token = (role) => jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('Rutas SPE — acceso', () => {
  it.each([
    ['get', '/api/spe'],
    ['get', '/api/spe/export'],
  ])('%s %s es pública (no pide login)', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect([401, 403]).not.toContain(res.status);
  });

  it.each([
    ['post', '/api/spe'],
    ['post', '/api/spe/upload'],
    ['get', '/api/spe/historial'],
    ['get', '/api/spe/pendientes'],
    ['patch', '/api/spe/cargas/1/estado'],
    ['get', '/api/spe/files/1'],
    ['delete', '/api/spe/files/1'],
    ['delete', '/api/spe/1'],
    ['post', '/api/spe/encuestas'],
  ])('%s %s sin sesión responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it.each([
    ['post', '/api/spe', 'admin'],
    ['post', '/api/spe/upload', 'admin'],
    ['get', '/api/spe/historial', 'admin'],
    ['get', '/api/spe/pendientes', 'admin'],
    ['patch', '/api/spe/cargas/1/estado', 'admin'],
    ['delete', '/api/spe/1', 'encuestador'],
    ['post', '/api/spe/encuestas', 'superadmin'],
  ])('%s %s con rol %s responde 403', async (metodo, ruta, rol) => {
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token(rol)}`);
    expect(res.status).toBe(403);
  });

  it('la gestión del SPE es del Superadmin', async () => {
    const res = await request(app).get('/api/spe/historial').set('Authorization', `Bearer ${token('superadmin')}`);
    expect([401, 403]).not.toContain(res.status);
  });

  it('el encuestador puede mandar encuestas SPE', async () => {
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token('encuestador')}`);
    expect([401, 403]).not.toContain(res.status);
  });
});
