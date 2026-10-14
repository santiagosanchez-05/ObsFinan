const request = require('supertest');
const jwt = require('jsonwebtoken');

// US57 — encuesta ICA del encuestador desde "Mis eventos": el período sale de
// la fecha del evento, no del formulario.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('../notificaciones/notificaciones.service');

const pool = require('../../config/db');
const app = require('../../app');
const { filaEncuestaIcaSchema } = require('./ica.validation');
const notificaciones = require('../notificaciones/notificaciones.service');

const token = (role) => jwt.sign({ userId: 9, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Una respuesta válida: la primera opción de cada pregunta obligatoria.
function respuestas() {
  const datos = {};
  Object.entries(filaEncuestaIcaSchema.shape).forEach(([campo, tipo]) => {
    if (campo === 'filaExcel') return;
    const enumerado = tipo.options ?? tipo.unwrap?.()?.unwrap?.()?.options;
    if (enumerado) datos[campo] = enumerado[0];
  });
  // P22 = No: el bloque P23–P27 no aplica.
  ['q23LifeInsuranceDuration', 'q24ReasonAcquired', 'q25PolicyReviewFrequency', 'q26WouldSwitchProvider', 'q27SatisfactionCurrentPolicy']
    .forEach((campo) => { delete datos[campo]; });
  return { ...datos, q02Age: 30, q22HasLifeInsurance: 'No' };
}

let conexion;
beforeEach(() => {
  jest.clearAllMocks();
  conexion = {
    beginTransaction: jest.fn(),
    query: jest.fn().mockResolvedValueOnce([{ insertId: 70 }]).mockResolvedValueOnce([{ insertId: 80 }]),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(conexion);
});

describe('POST /api/ica/entrevistas — encuestador', () => {
  it('usa el año y trimestre de la fecha del evento', async () => {
    pool.query
      .mockResolvedValueOnce([[{ community_id: 3 }]]) // comuna de su sede
      .mockResolvedValueOnce([[{ year: 2026, quarter: 4, semester: 2 }]]); // evento asignado
    const res = await request(app)
      .post('/api/ica/entrevistas')
      .set('Authorization', `Bearer ${token('encuestador')}`)
      .send({ ...respuestas(), communityId: 3, eventId: 5 });

    expect(res.status).toBe(201);
    expect(res.body.periodo).toEqual({ year: 2026, quarter: 4 });
    const [, params] = conexion.query.mock.calls[1];
    expect(params.slice(0, 6)).toEqual([70, 3, 2026, 4, 9, 5]); // carga, comuna, año, trimestre, encuestador, evento
    expect(notificaciones.encuestaPendiente).toHaveBeenCalledWith({ modulo: 1, dataLoadId: 70, encuestadorId: 9, eventId: 5 });
  });

  it('si el evento no está asignado o no habilita ICA responde 400', async () => {
    pool.query.mockResolvedValueOnce([[{ community_id: 3 }]]).mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/ica/entrevistas')
      .set('Authorization', `Bearer ${token('encuestador')}`)
      .send({ ...respuestas(), communityId: 3, eventId: 5 });
    expect(res.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('sin evento responde 400', async () => {
    const res = await request(app)
      .post('/api/ica/entrevistas')
      .set('Authorization', `Bearer ${token('encuestador')}`)
      .send({ ...respuestas(), communityId: 3 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ica/entrevistas — Admin', () => {
  it('el Admin sí tiene que indicar año y trimestre', async () => {
    const res = await request(app)
      .post('/api/ica/entrevistas')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ ...respuestas(), communityId: 3 });
    expect(res.status).toBe(400);
    expect(res.body.detalles.fieldErrors).toEqual(expect.objectContaining({ year: expect.any(Array), quarter: expect.any(Array) }));
  });
});
