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
        { user_id: 3, first_name: 'Carlos', paternal_last_name: 'Cliente', maternal_last_name: null, email: 'carlos@test.com', status: 0, campus_name: 'La Paz', role_name: 'encuestador' },
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
        { rol: 'encuestador', total: 1 },
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

  // US9 — búsqueda y filtros por query param.
  function filasParaFiltros() {
    return [[
      { user_id: 1, first_name: 'Santiago', paternal_last_name: 'Sanchez', maternal_last_name: null, email: 'santi@test.com', status: 1, campus_id: 1, campus_name: 'Cochabamba', role_name: 'superadmin' },
      { user_id: 2, first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: 'Lopez', email: 'ana@test.com', status: 1, campus_id: 1, campus_name: 'Cochabamba', role_name: 'admin' },
      { user_id: 3, first_name: 'Carlos', paternal_last_name: 'Cliente', maternal_last_name: null, email: 'carlos@test.com', status: 0, campus_id: 2, campus_name: 'La Paz', role_name: 'encuestador' },
    ]];
  }

  it('con un rol inválido en el query, responde 400', async () => {
    const res = await request(app)
      .get('/api/users?rol=inventado')
      .set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
  });

  it('"cliente" ya no es un rol válido (Sprint 2: pasó a ser encuestador)', async () => {
    const res = await request(app)
      .get('/api/users?rol=cliente')
      .set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
  });

  it('filtra por texto (q) sobre nombre, apellidos o sede', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?q=ana')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(1);
    expect(res.body.usuarios[0].nombre).toBe('Ana');
  });

  it('filtra por rol exacto', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?rol=encuestador')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(1);
    expect(res.body.usuarios[0].nombre).toBe('Carlos');
  });

  it('filtra por sede (campusId)', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?campusId=1')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(2);
    expect(res.body.usuarios.map((u) => u.nombre).sort()).toEqual(['Ana', 'Santiago']);
  });

  it('combina rol y sede a la vez', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?rol=superadmin&campusId=2')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(0); // nadie es superadmin en La Paz
  });

  it('las stats y los gráficos NO cambian aunque se filtre la tabla', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?rol=encuestador')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalUsuarios).toBe(3); // los 3, no solo el filtrado
    expect(res.body.porRol).toEqual(
      expect.arrayContaining([
        { rol: 'superadmin', total: 1 },
        { rol: 'admin', total: 1 },
        { rol: 'encuestador', total: 1 },
      ]),
    );
  });

  it('sin filtros, devuelve la lista completa (comportamiento igual que antes)', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(3);
  });

  // US8 — paginado
  it('pagina el listado (pageSize) y devuelve los datos de paginación', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?page=2&pageSize=2')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(1); // 3 usuarios, 2 por página → la página 2 tiene 1
    expect(res.body.usuarios[0].nombre).toBe('Carlos');
    expect(res.body.paginacion).toEqual({ pagina: 2, porPagina: 2, total: 3, totalPaginas: 2 });
  });

  it('pagina sobre el resultado filtrado, no sobre el total', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?campusId=1&pageSize=1')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.usuarios).toHaveLength(1);
    expect(res.body.paginacion.total).toBe(2); // solo los 2 de Cochabamba
    expect(res.body.paginacion.totalPaginas).toBe(2);
  });

  it('si piden una página que no existe, devuelve la última', async () => {
    pool.query.mockResolvedValueOnce(filasParaFiltros()).mockResolvedValueOnce([[{ sedesActivas: 2 }]]).mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/users?page=99&pageSize=2')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.paginacion.pagina).toBe(2);
  });

  it('con una página inválida, responde 400', async () => {
    const res = await request(app)
      .get('/api/users?page=0')
      .set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/me/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).get('/api/users/me/photo');
    expect(res.status).toBe(401);
  });

  it('cualquier rol (no solo superadmin) puede ver su propia foto', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    pool.query.mockResolvedValueOnce([[{ image_blob: pngBuffer }]]);

    const res = await request(app).get('/api/users/me/photo').set('Authorization', `Bearer ${token('admin')}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    // Busca la foto del usuario del token, no de un id de la URL.
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM image'), ['user', 1]);
  });

  it('si no tiene foto, responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/users/me/photo').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/users/encuestadores (Sprint 2 — US54, andamiaje)', () => {
  it('sin sesión responde 401', async () => {
    const res = await request(app).post('/api/users/encuestadores');
    expect(res.status).toBe(401);
  });

  it('un encuestador no puede registrar encuestadores', async () => {
    const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(403);
  });

  it('Admin y Superadmin sí (el Admin solo en su sede, lo valida el controlador)', async () => {
    for (const rol of ['admin', 'superadmin']) {
      const res = await request(app).post('/api/users/encuestadores').set('Authorization', `Bearer ${token(rol)}`);
      expect([401, 403]).not.toContain(res.status);
    }
  });
});

describe('PUT /api/users/me/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).put('/api/users/me/photo');
    expect(res.status).toBe(401);
  });

  it('sin archivo, responde 400', async () => {
    const res = await request(app).put('/api/users/me/photo').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(400);
  });

  it('con un formato que no es JPG/PNG, responde 400', async () => {
    const res = await request(app)
      .put('/api/users/me/photo')
      .set('Authorization', `Bearer ${token('admin')}`)
      .attach('foto', Buffer.from('GIF89a'), { filename: 'foto.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
  });

  it('reemplaza la foto del usuario logueado en una transacción', async () => {
    const conexion = mockConexion();
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    const res = await request(app)
      .put('/api/users/me/photo')
      .set('Authorization', `Bearer ${token('admin')}`)
      .attach('foto', jpeg, { filename: 'yo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(conexion.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM image'), ['user', 1]);
    expect(conexion.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO image'), [expect.any(Buffer), 'user', 1]);
    expect(conexion.commit).toHaveBeenCalled();
  });

  it('si falla la BD, hace rollback y responde 500', async () => {
    const conexion = mockConexion();
    conexion.query.mockRejectedValueOnce(new Error('se cayó la BD'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app)
      .put('/api/users/me/photo')
      .set('Authorization', `Bearer ${token('admin')}`)
      .attach('foto', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'yo.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(conexion.rollback).toHaveBeenCalled();
    spy.mockRestore();
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
      campos({ rol: 'encuestador' }),
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

  it('si el rol es encuestador, no revisa si la sede ya tiene admin', async () => {
    const conexion = mockConexion();
    pool.query.mockResolvedValueOnce([[{ role_id: 3 }]]); // solo el lookup del rol
    conexion.query.mockResolvedValueOnce([{ insertId: 8 }]);

    const res = await enviar(
      request(app).post('/api/users').set('Authorization', `Bearer ${token('superadmin')}`),
      campos({ rol: 'encuestador' }),
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

describe('PATCH /api/users/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function cuerpo(overrides = {}) {
    return { rol: 'admin', campusId: 1, activo: true, ...overrides };
  }

  function usuarioDetalleMock() {
    return [[
      {
        user_id: 2, first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: null,
        email: 'ana@test.com', status: 1, created_at: '2026-01-01', updated_at: '2026-02-01',
        campus_id: 1, role_id: 2, campus_name: 'Cochabamba', role_name: 'admin',
        editor_first_name: null, editor_last_name: null,
      },
    ]];
  }

  it('sin token, responde 401', async () => {
    const res = await request(app).patch('/api/users/2').send(cuerpo());
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app).patch('/api/users/2').set('Authorization', `Bearer ${token('admin')}`).send(cuerpo());
    expect(res.status).toBe(403);
  });

  it('con un id que no es un número, responde 400', async () => {
    const res = await request(app)
      .patch('/api/users/no-es-un-id')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo());
    expect(res.status).toBe(400);
  });

  it('con datos inválidos (rol no permitido), responde 400', async () => {
    const res = await request(app)
      .patch('/api/users/2')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo({ rol: 'inventado' }));
    expect(res.status).toBe(400);
  });

  it('si el usuario no existe, responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]); // SELECT user_id ... no encuentra nada
    const res = await request(app)
      .patch('/api/users/999')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo());
    expect(res.status).toBe(404);
  });

  it('actualiza rol, sede y estado correctamente', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 2 }]]) // existe
      .mockResolvedValueOnce([[{ role_id: 2 }]]) // lookup del rol
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 0 }]]) // chequeo admin-por-sede
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce(usuarioDetalleMock()) // obtenerUsuarioPorId: SELECT principal
      .mockResolvedValueOnce([[{ tieneFoto: 0 }]]); // obtenerUsuarioPorId: tieneFoto

    const res = await request(app)
      .patch('/api/users/2')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo());

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ id: 2, rol: 'admin', sede: 'Cochabamba', activo: true });
    expect(pool.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE user'),
      [2, 1, 1, 1, 2], // role_id, campusId, status(1=activo), editadoPor(userId del token), userId
    );
  });

  it('al editarse a sí mismo, el chequeo de "un admin por sede" se excluye a sí mismo', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 1 }]])
      .mockResolvedValueOnce([[{ role_id: 2 }]])
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 0 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce(usuarioDetalleMock())
      .mockResolvedValueOnce([[{ tieneFoto: 0 }]]);

    const res = await request(app)
      .patch('/api/users/1')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo());

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('user_id != ?'),
      [1, 2, 1], // campusId, role_id, userId (excluido)
    );
  });

  it('si la sede ya tiene otro admin activo, responde 409', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 2 }]])
      .mockResolvedValueOnce([[{ role_id: 2 }]])
      .mockResolvedValueOnce([[{ adminsActivosEnSede: 1 }]]);

    const res = await request(app)
      .patch('/api/users/2')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo());

    expect(res.status).toBe(409);
  });

  it('no revisa el chequeo de admin-por-sede si activo es false', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 2 }]])
      .mockResolvedValueOnce([[{ role_id: 2 }]])
      .mockResolvedValueOnce([{}]) // directo al UPDATE, sin chequeo
      .mockResolvedValueOnce(usuarioDetalleMock())
      .mockResolvedValueOnce([[{ tieneFoto: 0 }]]);

    const res = await request(app)
      .patch('/api/users/2')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send(cuerpo({ activo: false }));

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(5);
  });
});

describe('PATCH /api/users/:id/estado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function usuarioDetalleMock() {
    return [[
      {
        user_id: 2, first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: null,
        email: 'ana@test.com', status: 0, created_at: '2026-01-01', updated_at: '2026-02-01',
        campus_id: 1, role_id: 2, campus_name: 'Cochabamba', role_name: 'admin',
        editor_first_name: null, editor_last_name: null,
      },
    ]];
  }

  it('sin token, responde 401', async () => {
    const res = await request(app).patch('/api/users/2/estado').send({ activo: false });
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app)
      .patch('/api/users/2/estado')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ activo: false });
    expect(res.status).toBe(403);
  });

  it('un superadmin no puede desactivar su propia cuenta', async () => {
    // token() firma userId: 1 por defecto
    const res = await request(app)
      .patch('/api/users/1/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ activo: false });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('si el usuario no existe, responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .patch('/api/users/999/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ activo: false });
    expect(res.status).toBe(404);
  });

  it('da de baja a un usuario (activo: false)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 2 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce(usuarioDetalleMock())
      .mockResolvedValueOnce([[{ tieneFoto: 0 }]]);

    const res = await request(app)
      .patch('/api/users/2/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.usuario.activo).toBe(false);
    expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE user'), [0, 1, 2]);
  });

  it('reactiva a un usuario (activo: true)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ user_id: 2 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce(usuarioDetalleMock())
      .mockResolvedValueOnce([[{ tieneFoto: 0 }]]);

    const res = await request(app)
      .patch('/api/users/2/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ activo: true });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE user'), [1, 1, 2]);
  });
});

describe('POST /api/users/:id/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin token, responde 401', async () => {
    const res = await request(app).post('/api/users/2/reset-password');
    expect(res.status).toBe(401);
  });

  it('con un rol que no es superadmin, responde 403', async () => {
    const res = await request(app).post('/api/users/2/reset-password').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('si el usuario no existe (o está inactivo), responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/users/999/reset-password')
      .set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(404);
  });

  it('genera una contraseña temporal UVL-XXXXXX y manda el correo', async () => {
    pool.query
      .mockResolvedValueOnce([[{ first_name: 'Ana', email: 'ana@test.com', status: 1 }]])
      .mockResolvedValueOnce([{}]); // UPDATE password_hash

    const res = await request(app)
      .post('/api/users/2/reset-password')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.passwordTemporal).toMatch(/^UVL-[A-Za-z0-9]{6}$/);
    expect(res.body.correoEnviado).toBe(true);
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@test.com' }));
  });

  it('si falla el envío del correo, igual queda restablecida (correoEnviado: false)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ first_name: 'Ana', email: 'ana@test.com', status: 1 }]])
      .mockResolvedValueOnce([{}]);
    transporter.sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const res = await request(app)
      .post('/api/users/2/reset-password')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.correoEnviado).toBe(false);
    expect(res.body.passwordTemporal).toMatch(/^UVL-[A-Za-z0-9]{6}$/);
  });
});
