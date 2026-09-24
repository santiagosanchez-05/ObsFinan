const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mockeamos la conexión a la BD — este test no necesita la base real.
jest.mock('../../config/db', () => ({
  query: jest.fn(),
}));

// Mockeamos el envío de correo — no queremos mandar mails reales en los tests.
jest.mock('../../config/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const app = require('../../app');

describe('POST /api/auth/login', () => {
  const CORREO = 'superadmin@bienestarfinanciero.test';
  const PASSWORD_CORRECTA = 'Temp-BienestarFinanciero2026';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 400 si el correo no tiene formato válido', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-es-correo', password: '123' });
    expect(res.status).toBe(400);
  });

  it('devuelve 401 si el correo no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]); // sin resultados
    const res = await request(app).post('/api/auth/login').send({ email: 'nadie@test.com', password: '123' });
    expect(res.status).toBe(401);
  });

  it('devuelve 401 si la contraseña es incorrecta', async () => {
    const hash = await bcrypt.hash(PASSWORD_CORRECTA, 10);
    pool.query.mockResolvedValueOnce([[
      { user_id: 1, first_name: 'Santiago', paternal_last_name: 'Admin', email: CORREO, password_hash: hash, status: 1, campus_id: 1, role_name: 'superadmin' },
    ]]);
    const res = await request(app).post('/api/auth/login').send({ email: CORREO, password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('devuelve 200 + token si el login es correcto', async () => {
    const hash = await bcrypt.hash(PASSWORD_CORRECTA, 10);
    pool.query.mockResolvedValueOnce([[
      { user_id: 1, first_name: 'Santiago', paternal_last_name: 'Admin', email: CORREO, password_hash: hash, status: 1, campus_id: 1, role_name: 'superadmin' },
    ]]);
    const res = await request(app).post('/api/auth/login').send({ email: CORREO, password: PASSWORD_CORRECTA });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ correo: CORREO, role: 'superadmin', debeCambiarPassword: false });
  });

  it('marca debeCambiarPassword: true si se logueó con una contraseña con formato UVL-XXXXXX', async () => {
    const passwordTemporal = 'UVL-a8K2p9';
    const hash = await bcrypt.hash(passwordTemporal, 10);
    pool.query.mockResolvedValueOnce([[
      { user_id: 3, first_name: 'Guido', paternal_last_name: 'Perez', email: CORREO, password_hash: hash, status: 1, campus_id: 1, role_name: 'encuestador' },
    ]]);
    const res = await request(app).post('/api/auth/login').send({ email: CORREO, password: passwordTemporal });
    expect(res.status).toBe(200);
    expect(res.body.user.debeCambiarPassword).toBe(true);
  });
});

describe('POST /api/auth/forgot-password', () => {
  const CORREO = 'superadmin@bienestarfinanciero.test';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 400 si el correo no tiene formato válido', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
  });

  it('devuelve el mismo mensaje genérico si el correo NO existe (no se manda correo)', async () => {
    pool.query.mockResolvedValueOnce([[]]); // buscarUsuarioPorCorreo no encuentra nada
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nadie@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Si el correo existe/);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('si el correo existe, genera el código, lo guarda con expiración a 15 min, y envía el correo', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 1, first_name: 'Santiago', paternal_last_name: 'Admin', email: CORREO, status: 1, campus_id: 1, role_name: 'superadmin' }]]) // buscarUsuarioPorCorreo
      .mockResolvedValueOnce([{ insertId: 1 }]); // INSERT INTO verification_code

    const res = await request(app).post('/api/auth/forgot-password').send({ email: CORREO });

    expect(res.status).toBe(200);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    // Verificamos que se guardó con exactamente 15 minutos de vigencia.
    const insertCall = pool.query.mock.calls[1];
    const [, params] = insertCall;
    const [, codigo, enviadoEn, expiraEn] = params;
    expect(codigo).toMatch(/^\d{6}$/);
    expect(expiraEn.getTime() - enviadoEn.getTime()).toBe(15 * 60 * 1000);
  });
});

describe('POST /api/auth/verify-code', () => {
  const CORREO = 'superadmin@bienestarfinanciero.test';
  const USUARIO_MOCK = { user_id: 1, first_name: 'Santiago', paternal_last_name: 'Admin', email: CORREO, status: 1, campus_id: 1, role_name: 'superadmin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 400 si el código no tiene 6 dígitos', async () => {
    const res = await request(app).post('/api/auth/verify-code').send({ email: CORREO, code: '123' });
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si el código no coincide con ninguno guardado', async () => {
    pool.query
      .mockResolvedValueOnce([[USUARIO_MOCK]]) // buscarUsuarioPorCorreo
      .mockResolvedValueOnce([[]]); // sin coincidencias en verification_code
    const res = await request(app).post('/api/auth/verify-code').send({ email: CORREO, code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
  });

  it('devuelve 400 si el código ya expiró', async () => {
    const yaExpiro = new Date(Date.now() - 60 * 1000); // expiró hace 1 minuto
    pool.query
      .mockResolvedValueOnce([[USUARIO_MOCK]])
      .mockResolvedValueOnce([[{ verification_code_id: 5, expires_at: yaExpiro }]]);
    const res = await request(app).post('/api/auth/verify-code').send({ email: CORREO, code: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expiró/i);
  });

  it('devuelve un resetToken si el código es correcto y todavía es válido', async () => {
    const todaviaValido = new Date(Date.now() + 10 * 60 * 1000); // vence en 10 min
    pool.query
      .mockResolvedValueOnce([[USUARIO_MOCK]])
      .mockResolvedValueOnce([[{ verification_code_id: 5, expires_at: todaviaValido }]])
      .mockResolvedValueOnce([{}]); // UPDATE ... SET status = 0
    const res = await request(app).post('/api/auth/verify-code').send({ email: CORREO, code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resetToken');
  });
});

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function tokenValido() {
    return jwt.sign({ userId: 1, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  }

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: tokenValido(), newPassword: 'Abc123' });
    expect(res.status).toBe(400);
  });

  it('rechaza una contraseña sin mayúscula', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: tokenValido(), newPassword: 'contrasena1' });
    expect(res.status).toBe(400);
  });

  it('rechaza una contraseña sin número', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: tokenValido(), newPassword: 'ContrasenaSegura' });
    expect(res.status).toBe(400);
  });

  it('rechaza una contraseña con el formato de contraseña temporal (UVL-XXXXXX)', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: tokenValido(), newPassword: 'UVL-a8K2p9' });
    expect(res.status).toBe(400);
  });

  it('rechaza un resetToken inválido/expirado', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: 'token-invalido', newPassword: 'ContrasenaSegura1' });
    expect(res.status).toBe(401);
  });

  it('actualiza la contraseña si el token y la nueva contraseña son válidos', async () => {
    pool.query.mockResolvedValueOnce([{}]); // UPDATE user SET password_hash...
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: tokenValido(), newPassword: 'ContrasenaSegura1' });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE user'), [expect.any(String), 1]);
  });
});

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function tokenSesion(userId = 1) {
    return jwt.sign({ userId, role: 'encuestador', campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  it('sin token, responde 401', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'UVL-a8K2p9', newPassword: 'ContrasenaSegura1' });
    expect(res.status).toBe(401);
  });

  it('rechaza una nueva contraseña con formato de contraseña temporal', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenSesion()}`)
      .send({ currentPassword: 'UVL-a8K2p9', newPassword: 'UVL-b9L3q0' });
    expect(res.status).toBe(400);
  });

  it('rechaza una nueva contraseña débil', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenSesion()}`)
      .send({ currentPassword: 'UVL-a8K2p9', newPassword: 'abc123' });
    expect(res.status).toBe(400);
  });

  it('si la contraseña actual no coincide, responde 401', async () => {
    const hashReal = await bcrypt.hash('UVL-a8K2p9', 10);
    pool.query.mockResolvedValueOnce([[{ password_hash: hashReal }]]);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenSesion()}`)
      .send({ currentPassword: 'esta-no-es', newPassword: 'ContrasenaSegura1' });

    expect(res.status).toBe(401);
  });

  it('con la contraseña actual correcta, actualiza la contraseña', async () => {
    const hashReal = await bcrypt.hash('UVL-a8K2p9', 10);
    pool.query
      .mockResolvedValueOnce([[{ password_hash: hashReal }]])
      .mockResolvedValueOnce([{}]); // UPDATE user SET password_hash...

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenSesion(7)}`)
      .send({ currentPassword: 'UVL-a8K2p9', newPassword: 'ContrasenaSegura1' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE user'), [expect.any(String), 7]);
  });
});

describe('PUT /api/auth/update-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function tokenSesion(userId = 1) {
    return jwt.sign({ userId, role: 'encuestador', campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  it('sin token, responde 401', async () => {
    const res = await request(app)
      .put('/api/auth/update-profile')
      .send({ first_name: 'Carlos', paternal_last_name: 'Mendez' });
    expect(res.status).toBe(401);
  });

  it('con datos inválidos (faltan nombres), responde 400', async () => {
    const res = await request(app)
      .put('/api/auth/update-profile')
      .set('Authorization', `Bearer ${tokenSesion()}`)
      .send({ first_name: '', paternal_last_name: '' });
    expect(res.status).toBe(400);
  });

  it('actualiza el perfil y devuelve el usuario con first_name, paternal_last_name, maternal_last_name', async () => {
    const usuarioActualizado = {
      user_id: 1,
      first_name: 'Carlos Eduardo',
      paternal_last_name: 'Mendez',
      maternal_last_name: 'Rojas',
      email: 'carlos@test.com',
      status: 1,
      campus_id: 1,
      campus_name: 'Cochabamba',
      role_name: 'encuestador',
    };

    pool.query
      .mockResolvedValueOnce([[{ user_id: 1 }]]) // SELECT user_id FROM user WHERE user_id = ? AND status = 1
      .mockResolvedValueOnce([{}]) // UPDATE user SET ...
      .mockResolvedValueOnce([[usuarioActualizado]]); // SELECT u.user_id, ...

    const res = await request(app)
      .put('/api/auth/update-profile')
      .set('Authorization', `Bearer ${tokenSesion(1)}`)
      .send({
        first_name: 'Carlos Eduardo',
        paternal_last_name: 'Mendez',
        maternal_last_name: 'Rojas',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Perfil actualizado correctamente');
    expect(res.body.user).toMatchObject({
      id: 1,
      first_name: 'Carlos Eduardo',
      paternal_last_name: 'Mendez',
      maternal_last_name: 'Rojas',
      nombre: 'Carlos Eduardo Mendez',
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user'),
      ['Carlos Eduardo', 'Mendez', 'Rojas', 1],
    );
  });
});

