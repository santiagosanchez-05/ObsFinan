const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mockeamos la conexión a la BD y el envío de correo — estos tests no
// necesitan la base real ni mandar mails de verdad.
jest.mock('../../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock('../../config/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const app = require('../../app');

// Simula pool.getConnection() para las rutas que usan transacciones
// (registrarUsuario). Devuelve una "conexión" con sus propios mocks.
function mockConexion() {
  const conexion = {
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(conexion);
  return conexion;
}

function token(role, campusId = 1) {
  return jwt.sign({ userId: 1, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('con superadmin, arma stats, porSede y porRol correctamente', async () => {
    pool.query
      .mockResolvedValueOnce([[
        { user_id: 1, first_name: 'Santiago', paternal_last_name: 'Sanchez', maternal_last_name: null, email: 'santi@test.com', status: 1, campus_name: 'Cochabamba', role_name: 'superadmin' },
        { user_id: 2, first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: 'Lopez', email: 'ana@test.com', status: 1, campus_name: 'Cochabamba', role_name: 'admin' },
        { user_id: 3, first_name: 'Carlos', paternal_last_name: 'Cliente', maternal_last_name: null, email: 'carlos@test.com', status: 0, campus_name: 'La Paz', role_name: 'cliente' },
      ]])
      .mockResolvedValueOnce([[{ sedesActivas: 2 }]])
      .mockResolvedValueOnce([[{ entity_id: 2 }]]); // solo Ana (user_id 2) tiene foto

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({ totalUsuarios: 3, sedesActivas: 2, adminsActivos: 1, cuentasInactivas: 1 });
    expect(res.body.porSede).toEqual(
      expect.arrayContaining([{ sede: 'Cochabamba', total: 2 }, { sede: 'La Paz', total: 1 }]),
    );
    expect(res.body.porRol).toEqual(
      expect.arrayContaining([
        { rol: 'superadmin', total: 1 },
        { rol: 'admin', total: 1 },
        { rol: 'cliente', total: 1 },
      ]),
    );
    expect(res.body.usuarios).toHaveLength(3);
    expect(res.body.usuarios[1]).toMatchObject({
      nombre: 'Ana',
      apellidos: 'Admin Lopez',
      sede: 'Cochabamba',
      rol: 'admin',
      activo: true,
      tieneFoto: true,
    });
    expect(res.body.usuarios[0]).toMatchObject({ tieneFoto: false });
    expect(res.body.usuarios[2]).toMatchObject({ apellidos: 'Cliente', activo: false, tieneFoto: false });
  });

  it('devuelve 500 si la base de datos falla', async () => {
    pool.query.mockRejectedValueOnce(new Error('conexión perdida'));
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/users/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).get('/api/users/1');
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app).get('/api/users/1').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('con un id que no es un número, responde 400', async () => {
    const res = await request(app).get('/api/users/no-es-un-id').set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
  });

  it('con un id que no existe, responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/users/999').set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(404);
  });

  it('con superadmin y un id válido, devuelve el detalle del usuario', async () => {
    pool.query.mockResolvedValueOnce([[
      {
        user_id: 2,
        first_name: 'Ana',
        paternal_last_name: 'Admin',
        maternal_last_name: 'Lopez',
        email: 'ana@test.com',
        status: 1,
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-02-20T10:00:00.000Z',
        campus_name: 'Cochabamba',
        role_name: 'admin',
      },
    ]])
    .mockResolvedValueOnce([[{ tieneFoto: 1 }]]);

    const res = await request(app).get('/api/users/2').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 2,
      nombre: 'Ana',
      apellidoPaterno: 'Admin',
      apellidoMaterno: 'Lopez',
      apellidos: 'Admin Lopez',
      correo: 'ana@test.com',
      sede: 'Cochabamba',
      rol: 'admin',
      activo: true,
      tieneFoto: true,
    });
    expect(res.body).toHaveProperty('fechaRegistro');
    expect(res.body).toHaveProperty('fechaActualizacion');
  });
});

describe('GET /api/users/:id/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).get('/api/users/2/photo');
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app).get('/api/users/2/photo').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('con un id que no es un número, responde 400', async () => {
    const res = await request(app).get('/api/users/no-es-un-id/photo').set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
  });

  it('si el usuario no tiene foto, responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/users/2/photo').set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(404);
  });

  it('devuelve el binario de la foto con el Content-Type correcto (PNG)', async () => {
    // Firma real de un PNG (los primeros 4 bytes) + relleno.
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xff]);
    pool.query.mockResolvedValueOnce([[{ image_blob: pngBuffer }]]);

    const res = await request(app).get('/api/users/2/photo').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(res.body, pngBuffer)).toBe(0);
  });

  it('devuelve el binario de la foto con el Content-Type correcto (JPEG)', async () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    pool.query.mockResolvedValueOnce([[{ image_blob: jpegBuffer }]]);

    const res = await request(app).get('/api/users/2/photo').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
  });
});

describe('GET /api/users/campuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).get('/api/users/campuses');
    expect(res.status).toBe(401);
  });

  it('con superadmin, devuelve las sedes activas', async () => {
    pool.query.mockResolvedValueOnce([[
      { campus_id: 1, campus_name: 'Cochabamba' },
      { campus_id: 2, campus_name: 'La Paz' },
    ]]);

    const res = await request(app).get('/api/users/campuses').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, nombre: 'Cochabamba' },
      { id: 2, nombre: 'La Paz' },
    ]);
  });
});

describe('POST /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function campos(overrides = {}) {
    return {
      nombre: 'Juan',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'García',
      correo: 'juan.perez@univalle.edu',
      rol: 'admin',
      campusId: '1',
      ...overrides,
    };
  }

  function enviar(req, campos) {
    let r = req;
    for (const [key, value] of Object.entries(campos)) {
      r = r.field(key, value);
    }
    return r;
  }

  it('sin token, responde 401', async () => {
    const res = await enviar(request(app).post('/api/users'), campos());
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('admin')}`),
      campos(),
    );
    expect(res.status).toBe(403);
  });

  it('con datos inválidos (falta el nombre), responde 400', async () => {
    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos({ nombre: '' }),
    );
    expect(res.status).toBe(400);
  });

  it('con una foto que no es JPG/PNG, responde 400 en JSON', async () => {
    const req = enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos(),
    );
    const res = await req.attach('foto', Buffer.from('no soy una imagen'), { filename: 'archivo.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('con datos válidos, crea el usuario, genera la contraseña temporal y manda el correo', async () => {
    const conexion = mockConexion();
    pool.query
      .mockResolvedValueOnce([[{ role_id: 2 }]]) // lookup del rol
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 0 }]]); // esa sede no tiene admin activo
    conexion.query
      .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT INTO user
      .mockResolvedValueOnce([{}]); // INSERT INTO image (hay foto)

    const req = enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos(),
    );
    const res = await req.attach('foto', Buffer.from('contenido-de-prueba'), { filename: 'foto.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(42);
    expect(res.body.passwordTemporal).toMatch(/^UVL-[A-Za-z0-9]{6}$/);
    expect(res.body.correoEnviado).toBe(true);
    expect(conexion.commit).toHaveBeenCalled();
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'juan.perez@univalle.edu' }),
    );
    // La foto se guarda en `image`, no en `user`.
    expect(conexion.query.mock.calls[1][0]).toMatch(/INSERT INTO image/);
  });

  it('sin foto, no inserta en `image` y sigue creando el usuario', async () => {
    const conexion = mockConexion();
    pool.query.mockResolvedValueOnce([[{ role_id: 3 }]]);
    conexion.query.mockResolvedValueOnce([{ insertId: 5 }]);

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos({ rol: 'cliente' }),
    );

    expect(res.status).toBe(201);
    expect(conexion.query).toHaveBeenCalledTimes(1); // solo el INSERT INTO user
  });

  it('si el correo ya existe (ER_DUP_ENTRY), responde 409', async () => {
    const conexion = mockConexion();
    pool.query
      .mockResolvedValueOnce([[{ role_id: 2 }]])
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 0 }]]);
    const errorDuplicado = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    conexion.query.mockRejectedValueOnce(errorDuplicado);

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos(),
    );

    expect(res.status).toBe(409);
    expect(conexion.rollback).toHaveBeenCalled();
  });

  it('si falla el envío del correo, el usuario igual queda creado (correoEnviado: false)', async () => {
    const conexion = mockConexion();
    pool.query
      .mockResolvedValueOnce([[{ role_id: 2 }]])
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 0 }]]);
    conexion.query.mockResolvedValueOnce([{ insertId: 7 }]);
    transporter.sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos(),
    );

    expect(res.status).toBe(201);
    expect(res.body.correoEnviado).toBe(false);
    expect(res.body.passwordTemporal).toMatch(/^UVL-[A-Za-z0-9]{6}$/);
  });

  it('si la sede ya tiene un admin activo, responde 409 y no crea nada', async () => {
    pool.query
      .mockResolvedValueOnce([[{ role_id: 2 }]]) // lookup del rol
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 1 }]]); // ya hay uno

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos(),
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Esta sede ya tiene un administrador activo');
    expect(pool.getConnection).not.toHaveBeenCalled(); // ni siquiera abre transacción
  });

  it('si el rol es cliente, no revisa si la sede ya tiene admin', async () => {
    const conexion = mockConexion();
    pool.query.mockResolvedValueOnce([[{ role_id: 3 }]]); // solo el lookup del rol
    conexion.query.mockResolvedValueOnce([{ insertId: 8 }]);

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos({ rol: 'cliente' }),
    );

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(1); // no se agregó el chequeo de admin
  });

  it('permite registrar un superadmin, sin el chequeo de "un admin por sede"', async () => {
    const conexion = mockConexion();
    pool.query.mockResolvedValueOnce([[{ role_id: 1 }]]); // solo el lookup del rol
    conexion.query.mockResolvedValueOnce([{ insertId: 9 }]);

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos({ rol: 'superadmin' }),
    );

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(1); // no se agregó el chequeo de admin
  });
});
