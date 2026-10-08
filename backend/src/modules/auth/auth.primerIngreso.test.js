const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Primer ingreso con contraseña temporal (UVL-XXXXXX): el token trae la marca
// firmada, el resto del sistema queda bloqueado y /first-password pide solo la
// contraseña nueva.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const tokenTemporal = (extra = {}) =>
  jwt.sign({ userId: 20, role: 'admin', campusId: 1, debeCambiarPassword: true, ...extra }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
const tokenNormal = () => jwt.sign({ userId: 20, role: 'admin', campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Login con contraseña temporal', () => {
  it('el token trae la marca debeCambiarPassword', async () => {
    const hash = await bcrypt.hash('UVL-a8K2p9', 10);
    pool.query.mockResolvedValueOnce([[
      { user_id: 20, first_name: 'Ana', paternal_last_name: 'Paz', email: 'ana@test.com', password_hash: hash, status: 1, campus_id: 1, role_name: 'admin' },
    ]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'UVL-a8K2p9' });
    expect(res.status).toBe(200);
    expect(jwt.decode(res.body.token)).toMatchObject({ userId: 20, debeCambiarPassword: true });
  });

  it('con una contraseña normal el token no trae la marca', async () => {
    const hash = await bcrypt.hash('MiClave2026', 10);
    pool.query.mockResolvedValueOnce([[
      { user_id: 20, first_name: 'Ana', paternal_last_name: 'Paz', email: 'ana@test.com', password_hash: hash, status: 1, campus_id: 1, role_name: 'admin' },
    ]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.com', password: 'MiClave2026' });
    expect(jwt.decode(res.body.token).debeCambiarPassword).toBeUndefined();
  });
});

describe('Bloqueo mientras no cambie la contraseña temporal', () => {
  it.each([
    ['get', '/api/users/me/photo'],
    ['get', '/api/ica/historial'],
    ['post', '/api/events'],
    ['post', '/api/auth/change-password'],
  ])('%s %s responde 403 con el código CAMBIO_PASSWORD_OBLIGATORIO', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${tokenTemporal()}`);
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('CAMBIO_PASSWORD_OBLIGATORIO');
  });

  it('también en los endpoints públicos si manda ese token', async () => {
    const res = await request(app).get('/api/events').set('Authorization', `Bearer ${tokenTemporal()}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/first-password', () => {
  it('cambia la contraseña sin pedir la actual y devuelve un token sin la marca', async () => {
    pool.query.mockResolvedValueOnce([[{ user_id: 20 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post('/api/auth/first-password')
      .set('Authorization', `Bearer ${tokenTemporal()}`)
      .send({ newPassword: 'NuevaClave2026' });

    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('UPDATE user SET password_hash');
    expect(await bcrypt.compare('NuevaClave2026', params[0])).toBe(true);
    expect(params[1]).toBe(20);
    const payload = jwt.decode(res.body.token);
    expect(payload).toMatchObject({ userId: 20, role: 'admin', campusId: 1 });
    expect(payload.debeCambiarPassword).toBeUndefined();
  });

  it('el token nuevo ya puede usar el resto del sistema', async () => {
    pool.query.mockResolvedValueOnce([[{ user_id: 20 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/auth/first-password')
      .set('Authorization', `Bearer ${tokenTemporal()}`)
      .send({ newPassword: 'NuevaClave2026' });

    pool.query.mockResolvedValueOnce([[]]); // la foto: no tiene
    const foto = await request(app).get('/api/users/me/photo').set('Authorization', `Bearer ${res.body.token}`);
    expect(foto.status).toBe(404);
  });

  it('valida las reglas de la contraseña nueva', async () => {
    for (const newPassword of ['corta1A', 'sinmayuscula1', 'SinNumero', 'UVL-abc123']) {
      const res = await request(app)
        .post('/api/auth/first-password')
        .set('Authorization', `Bearer ${tokenTemporal()}`)
        .send({ newPassword });
      expect(res.status).toBe(400);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('con un token normal (no es primer ingreso) responde 403', async () => {
    const res = await request(app)
      .post('/api/auth/first-password')
      .set('Authorization', `Bearer ${tokenNormal()}`)
      .send({ newPassword: 'NuevaClave2026' });
    expect(res.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('sin sesión responde 401', async () => {
    const res = await request(app).post('/api/auth/first-password').send({ newPassword: 'NuevaClave2026' });
    expect(res.status).toBe(401);
  });
});
