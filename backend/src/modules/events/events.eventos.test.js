const request = require('supertest');
const jwt = require('jsonwebtoken');

// Eventos (Santiago): listado, detalle, registro, edición, baja e imagen.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const FUTURA = '2099-12-31';
const PASADA = '2000-01-01';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

function mockConexion() {
  const conexion = {
    query: jest.fn().mockResolvedValue([{ insertId: 50 }]),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(conexion);
  return conexion;
}

function filaEvento(cambios = {}) {
  return {
    event_id: 5,
    campus_id: 1,
    campus_name: 'Cochabamba',
    title: 'Feria financiera',
    fecha: FUTURA,
    hora: '10:00',
    modality: 1,
    available_slots: 30,
    location: 'Campus Tiquipaya',
    description: 'Charla y encuestas',
    external_link: 'https://facebook.com/evento',
    has_ica: 1,
    has_spe: 0,
    image_id: null,
    ...cambios,
  };
}

const datosValidos = {
  titulo: 'Feria financiera',
  fecha: FUTURA,
  hora: '10:00',
  modalidad: '1',
  lugar: 'Campus Tiquipaya',
  descripcion: 'Charla y encuestas',
  cupos: '30',
  enlaceExterno: 'https://facebook.com/evento',
  hasIca: 'true',
  hasSpe: 'false',
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/events (agenda pública)', () => {
  it('sin sesión lista los próximos eventos con paginación y sedes para filtrar', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ image_id: 9 })]])
      .mockResolvedValueOnce([[{ campus_id: 1, campus_name: 'Cochabamba' }]]);

    const res = await request(app).get('/api/events');

    expect(res.status).toBe(200);
    expect(res.body.eventos).toEqual([
      expect.objectContaining({
        id: 5,
        titulo: 'Feria financiera',
        fecha: FUTURA,
        modalidadNombre: 'Presencial',
        hasIca: true,
        hasSpe: false,
        sede: 'Cochabamba',
        imagenUrl: '/api/events/5/image?v=9',
      }),
    ]);
    expect(res.body.paginacion).toEqual({ pagina: 1, porPagina: 12, total: 1, totalPaginas: 1 });
    expect(res.body.opcionesFiltros.sedes).toEqual([{ id: 1, nombre: 'Cochabamba' }]);
    // Próximos = activos y desde hoy, ordenados del más cercano al más lejano.
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('e.event_date >= ?');
    expect(sql).toContain('ORDER BY e.event_date ASC');
    expect(params[0]).toBe(1);
  });

  it('periodo=pasados filtra antes de hoy y ordena del más reciente', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/events?periodo=pasados&campusId=1&q=feria');

    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('e.event_date < ?');
    expect(sql).toContain('ORDER BY e.event_date DESC');
    expect(params).toEqual(expect.arrayContaining([1, '%feria%']));
  });

  it('con un periodo inválido responde 400', async () => {
    const res = await request(app).get('/api/events?periodo=ayer');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:id (detalle público)', () => {
  it('devuelve el evento', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento()]]);
    const res = await request(app).get('/api/events/5');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, enlaceExterno: 'https://facebook.com/evento', imagenUrl: null });
  });

  it('responde 404 si no existe o está dado de baja', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/events/99');
    expect(res.status).toBe(404);
  });

  it('responde 400 con un id inválido', async () => {
    const res = await request(app).get('/api/events/abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:id/image', () => {
  it('devuelve la imagen con su tipo', async () => {
    pool.query.mockResolvedValueOnce([[{ image_blob: PNG }]]);
    const res = await request(app).get('/api/events/5/image');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
  });

  it('responde 404 si el evento no tiene imagen', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/events/5/image');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/events (registro)', () => {
  it('el Admin registra en su propia sede', async () => {
    const conexion = mockConexion();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(datosValidos);

    expect(res.status).toBe(201);
    expect(res.body.eventId).toBe(50);
    const [sql, params] = conexion.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO event');
    // campus, título, fecha, hora, modalidad, cupos, lugar, descripción, enlace, ica, spe, estado, usuario
    expect(params).toEqual([1, 'Feria financiera', FUTURA, '10:00', 1, 30, 'Campus Tiquipaya', 'Charla y encuestas', 'https://facebook.com/evento', 1, 0, 1, 7]);
    expect(conexion.commit).toHaveBeenCalled();
  });

  it('guarda la imagen en la tabla image con type = event', async () => {
    const conexion = mockConexion();

    const req = request(app).post('/api/events').set('Authorization', `Bearer ${token('admin', 1)}`);
    Object.entries(datosValidos).forEach(([k, v]) => req.field(k, v));
    const res = await req.attach('imagen', PNG, { filename: 'evento.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    const [sql, params] = conexion.query.mock.calls[1];
    expect(sql).toContain('INSERT INTO image');
    expect(params[1]).toBe('event');
    expect(params[2]).toBe(50);
  });

  it('rechaza una imagen que no es JPG ni PNG', async () => {
    const req = request(app).post('/api/events').set('Authorization', `Bearer ${token('admin', 1)}`);
    Object.entries(datosValidos).forEach(([k, v]) => req.field(k, v));
    const res = await req.attach('imagen', Buffer.from('GIF89a'), { filename: 'x.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La imagen debe ser JPG o PNG');
  });

  it('el Admin no puede habilitar la encuesta SPE', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, hasSpe: 'true' });
    expect(res.status).toBe(403);
  });

  it('el Admin no puede registrar en otra sede', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, campusId: '2' });
    expect(res.status).toBe(403);
  });

  it('el Superadmin elige la sede y puede habilitar SPE', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 3 }]]); // la sede existe
    const conexion = mockConexion();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send({ ...datosValidos, campusId: '3', hasSpe: 'true' });

    expect(res.status).toBe(201);
    const params = conexion.query.mock.calls[0][1];
    expect(params[0]).toBe(3);
    expect(params[10]).toBe(1);
  });

  it('el Superadmin tiene que elegir una sede', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send(datosValidos);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Selecciona la sede del evento');
  });

  it('rechaza una sede inexistente o inactiva', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send({ ...datosValidos, campusId: '9' });
    expect(res.status).toBe(400);
  });

  it('no permite registrar un evento con fecha pasada', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, fecha: PASADA });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La fecha del evento no puede ser anterior a hoy');
  });

  it('valida los campos obligatorios y el formato del enlace', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, titulo: '', modalidad: '7', enlaceExterno: 'facebook' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.detalles.fieldErrors)).toEqual(
      expect.arrayContaining(['titulo', 'modalidad', 'enlaceExterno']),
    );
  });

  it('acepta un evento sin cupos, descripción, enlace ni encuestas', async () => {
    const conexion = mockConexion();
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ titulo: 'Charla', fecha: FUTURA, hora: '18:30', modalidad: '2', lugar: 'Zoom', cupos: '', descripcion: '', enlaceExterno: '' });
    expect(res.status).toBe(201);
    const params = conexion.query.mock.calls[0][1];
    expect(params.slice(5, 11)).toEqual([null, 'Zoom', null, null, 0, 0]);
  });
});

describe('PATCH /api/events/:id (edición)', () => {
  it('el Admin no puede editar eventos de otra sede', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 2 }]]);
    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(datosValidos);
    expect(res.status).toBe(403);
  });

  it('responde 404 si el evento no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .patch('/api/events/99')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(datosValidos);
    expect(res.status).toBe(404);
  });

  it('permite dejar la fecha que ya tenía aunque haya pasado', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ fecha: PASADA })]]);
    const conexion = mockConexion();

    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, fecha: PASADA, titulo: 'Feria (corregida)' });

    expect(res.status).toBe(200);
    const [sql, params] = conexion.query.mock.calls[0];
    expect(sql).toContain('UPDATE event');
    expect(params[1]).toBe('Feria (corregida)');
    expect(params.slice(-3)).toEqual([7, 5, 1]);
  });

  it('no permite mover la fecha al pasado', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento()]]);
    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, fecha: PASADA });
    expect(res.status).toBe(400);
  });

  it('el Admin no puede quitar la encuesta SPE que habilitó un Superadmin', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ has_spe: 1 })]]);
    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, hasSpe: 'false' });
    expect(res.status).toBe(403);
  });

  it('quitarImagen borra la imagen actual', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ image_id: 9 })]]);
    const conexion = mockConexion();

    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send({ ...datosValidos, quitarImagen: 'true' });

    expect(res.status).toBe(200);
    expect(conexion.query.mock.calls[1][0]).toContain('DELETE FROM image');
    expect(conexion.query).toHaveBeenCalledTimes(2);
  });

  it('el Superadmin edita eventos de cualquier sede y conserva la sede si no la cambia', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 4 }]])
      .mockResolvedValueOnce([[filaEvento({ campus_id: 4 })]])
      .mockResolvedValueOnce([[{ campus_id: 4 }]]); // la sede existe
    const conexion = mockConexion();

    const res = await request(app)
      .patch('/api/events/5')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send(datosValidos);

    expect(res.status).toBe(200);
    expect(conexion.query.mock.calls[0][1][0]).toBe(4);
  });
});

describe('DELETE /api/events/:id (baja lógica)', () => {
  it('da de baja el evento y sus asignaciones', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 1 }]]);
    const conexion = mockConexion();

    const res = await request(app).delete('/api/events/5').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(res.status).toBe(200);
    expect(conexion.query.mock.calls[0][0]).toContain('UPDATE event SET status');
    expect(conexion.query.mock.calls[0][1]).toEqual([0, 7, 5]);
    expect(conexion.query.mock.calls[1][0]).toContain('UPDATE event_surveyor SET status');
  });

  it('el Admin no puede eliminar eventos de otra sede', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 2 }]]);
    const res = await request(app).delete('/api/events/5').set('Authorization', `Bearer ${token('admin', 1)}`);
    expect(res.status).toBe(403);
  });
});
