const request = require('supertest');
const jwt = require('jsonwebtoken');

// El encuestador se anota solo en eventos con encuesta de su sede (Santiago).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 11, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

beforeEach(() => {
  jest.resetAllMocks();
});

describe('POST /api/events/:id/participacion', () => {
  it('sin sesión responde 401 y con otro rol 403', async () => {
    expect((await request(app).post('/api/events/5/participacion')).status).toBe(401);
    const res = await request(app).post('/api/events/5/participacion').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('el encuestador se anota (o se reactiva si se había bajado)', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento()]]).mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).post('/api/events/5/participacion').set('Authorization', `Bearer ${token('encuestador')}`);

    expect(res.status).toBe(200);
    expect(res.body.participando).toBe(true);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('INSERT INTO event_surveyor');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(params).toEqual([5, 11, 1, 11]);
  });

  it('no puede anotarse en eventos de otra sede', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento({ campus_id: 2 })]]);
    const res = await request(app).post('/api/events/5/participacion').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('no puede anotarse en eventos sin encuesta', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento({ has_ica: 0, has_spe: 0 })]]);
    const res = await request(app).post('/api/events/5/participacion').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Este evento no lleva encuestas');
  });

  it('no puede anotarse en eventos que ya pasaron', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento({ fecha: '2000-01-01' })]]);
    const res = await request(app).post('/api/events/5/participacion').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El evento ya pasó');
  });

  it('responde 404 si el evento no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/events/99/participacion').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/events/:id/participacion', () => {
  it('el encuestador deja de participar (baja lógica)', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento({ has_ica: 0, has_spe: 1 })]]).mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete('/api/events/5/participacion').set('Authorization', `Bearer ${token('encuestador')}`);

    expect(res.status).toBe(200);
    expect(res.body.participando).toBe(false);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('UPDATE event_surveyor SET status');
    expect(params).toEqual([0, 11, 5, 11]);
  });
});

describe('GET /api/events/:id con sesión de encuestador', () => {
  it('indica si ya está anotado', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento()]]).mockResolvedValueOnce([[{ 1: 1 }]]);
    const res = await request(app).get('/api/events/5').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(200);
    expect(res.body.participando).toBe(true);
  });

  it('a los visitantes no les agrega el dato', async () => {
    pool.query.mockResolvedValueOnce([[filaEvento()]]);
    const res = await request(app).get('/api/events/5');
    expect(res.body).not.toHaveProperty('participando');
  });
});

describe('GET /api/events para el encuestador', () => {
  it('marca en qué eventos está anotado y en cuáles puede participar', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[filaEvento(), filaEvento({ event_id: 6, campus_id: 2, campus_name: 'La Paz' })]])
      .mockResolvedValueOnce([[{ event_id: 5 }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/events').set('Authorization', `Bearer ${token('encuestador')}`);

    expect(res.status).toBe(200);
    expect(res.body.eventos.map((e) => [e.id, e.participando, e.puedeParticipar])).toEqual([
      [5, true, true],
      [6, false, false],
    ]);
    expect(pool.query.mock.calls[2][1]).toEqual([11, 1, [5, 6]]);
  });

  it('disponibles=true filtra eventos con encuesta de su sede que no pasaron', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/events?disponibles=true&periodo=pasados&campusId=3')
      .set('Authorization', `Bearer ${token('encuestador', 1)}`);

    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('(e.has_ica = 1 OR e.has_spe = 1)');
    expect(sql).toContain('e.event_date >= ?');
    expect(params).toContain(1);
    expect(params).not.toContain(3);
  });

  it('a un visitante disponibles=true no le cambia nada', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);
    await request(app).get('/api/events?disponibles=true');
    expect(pool.query.mock.calls[0][0]).not.toContain('has_ica');
  });
});
