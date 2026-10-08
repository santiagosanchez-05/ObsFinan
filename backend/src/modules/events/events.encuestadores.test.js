const request = require('supertest');
const jwt = require('jsonwebtoken');

// Asignación de encuestadores a un evento (Santiago — US55).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

function filaEvento(cambios = {}) {
  return {
    event_id: 5,
    campus_id: 1,
    campus_name: 'Cochabamba',
    title: 'Feria financiera',
    fecha: '2099-12-31',
    hora: '10:00',
    modality: 1,
    available_slots: null,
    location: 'Campus',
    description: null,
    external_link: null,
    has_ica: 1,
    has_spe: 0,
    image_id: null,
    ...cambios,
  };
}

const persona = (id, nombre, extra = {}) => ({
  user_id: id,
  first_name: nombre,
  paternal_last_name: 'Pérez',
  maternal_last_name: null,
  email: `${nombre.toLowerCase()}@test.com`,
  ...extra,
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/events/:id/encuestadores', () => {
  it('lista los asignados (marcando quién se anotó solo) y los disponibles de la sede', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]]) // sede del evento (middleware)
      .mockResolvedValueOnce([[filaEvento()]])
      .mockResolvedValueOnce([[
        persona(11, 'Ana', { created_modified_by: 11 }),
        persona(12, 'Luis', { created_modified_by: 7 }),
      ]])
      .mockResolvedValueOnce([[persona(13, 'Carla')]]);

    const res = await request(app).get('/api/events/5/encuestadores').set('Authorization', `Bearer ${token('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.evento.titulo).toBe('Feria financiera');
    expect(res.body.asignados).toEqual([
      expect.objectContaining({ id: 11, nombre: 'Ana Pérez', seAnotoSolo: true }),
      expect.objectContaining({ id: 12, nombre: 'Luis Pérez', seAnotoSolo: false }),
    ]);
    expect(res.body.disponibles).toEqual([{ id: 13, nombre: 'Carla Pérez', correo: 'carla@test.com' }]);
    // Disponibles = encuestadores activos de la sede del evento.
    expect(pool.query.mock.calls[3][1]).toEqual([1, 1, 5, 1]);
  });

  it('el Admin de otra sede recibe 403', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 2 }]]);
    const res = await request(app).get('/api/events/5/encuestadores').set('Authorization', `Bearer ${token('admin', 1)}`);
    expect(res.status).toBe(403);
  });

  it('el Superadmin puede ver los de cualquier sede', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 2 }]])
      .mockResolvedValueOnce([[filaEvento({ campus_id: 2 })]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/events/5/encuestadores').set('Authorization', `Bearer ${token('superadmin', 1)}`);
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[3][1]).toEqual([1, 2, 5, 1]);
  });
});

describe('POST /api/events/:id/encuestadores', () => {
  it('asigna un encuestador activo de la sede del evento', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento()]])
      .mockResolvedValueOnce([[{ 1: 1 }]]) // es encuestador activo de la sede
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post('/api/events/5/encuestadores')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ userId: 13 });

    expect(res.status).toBe(201);
    const [sql, params] = pool.query.mock.calls[3];
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(params).toEqual([5, 13, 1, 7]);
  });

  it('rechaza a un usuario que no es encuestador activo de esa sede', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento()]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/events/5/encuestadores')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ userId: 99 });
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  it('no asigna en eventos sin encuesta', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ has_ica: 0, has_spe: 0 })]]);
    const res = await request(app)
      .post('/api/events/5/encuestadores')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ userId: 13 });
    expect(res.status).toBe(400);
  });

  it('no asigna en eventos que ya pasaron', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento({ fecha: '2000-01-01' })]]);
    const res = await request(app)
      .post('/api/events/5/encuestadores')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ userId: 13 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El evento ya pasó');
  });

  it('valida que venga el encuestador', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 1 }]]); // la ruta primero verifica la sede
    const res = await request(app)
      .post('/api/events/5/encuestadores')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/events/:id/encuestadores/:userId', () => {
  it('quita al encuestador (baja lógica)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento()]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete('/api/events/5/encuestadores/13').set('Authorization', `Bearer ${token('admin')}`);

    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[2];
    expect(sql).toContain('UPDATE event_surveyor SET status');
    expect(params).toEqual([0, 7, 5, 13, 1]);
  });

  it('responde 404 si no estaba asignado', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[filaEvento()]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app).delete('/api/events/5/encuestadores/13').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(404);
  });

  it('el Admin de otra sede recibe 403', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 2 }]]);
    const res = await request(app).delete('/api/events/5/encuestadores/13').set('Authorization', `Bearer ${token('admin', 1)}`);
    expect(res.status).toBe(403);
  });
});
