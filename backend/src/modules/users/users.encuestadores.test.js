const request = require('supertest');
const jwt = require('jsonwebtoken');

// US54 — registro directo de encuestadores.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('./users.service', () => ({
  ...jest.requireActual('./users.service'),
  registrarUsuario: jest.fn(),
}));

const { registrarUsuario } = require('./users.service');
const app = require('../../app');

const token = (role, campusId = 1) => jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });
const datos = { nombre: 'Ana', apellidoPaterno: 'Paz', correo: 'ana@correo.com' };

beforeEach(() => {
  jest.clearAllMocks();
  registrarUsuario.mockResolvedValue({ userId: 30, correoEnviado: true });
});

describe('POST /api/users/encuestadores', () => {
  it('el Admin registra en su sede aunque mande otra', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('admin', 1)}`).send({ ...datos, campusId: 3 });
    expect(res.status).toBe(201);
    expect(registrarUsuario).toHaveBeenCalledWith(expect.objectContaining({ rol: 'encuestador', campusId: 1 }));
  });

  it('el Admin no necesita mandar la sede', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('admin', 1)}`).send(datos);
    expect(res.status).toBe(201);
  });

  it('el Superadmin tiene que elegir la sede', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('superadmin')}`).send(datos);
    expect(res.status).toBe(400);
    expect(registrarUsuario).not.toHaveBeenCalled();
  });

  it('el Superadmin registra en la sede elegida', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('superadmin')}`).send({ ...datos, campusId: 2 });
    expect(res.status).toBe(201);
    expect(registrarUsuario).toHaveBeenCalledWith(expect.objectContaining({ campusId: 2 }));
  });

  it('el encuestador no puede registrar encuestadores', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('encuestador')}`).send(datos);
    expect(res.status).toBe(403);
  });
});
