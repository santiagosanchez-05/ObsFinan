const request = require('supertest');
const jwt = require('jsonwebtoken');

// US66 — encuesta SPE del encuestador desde "Mis eventos".
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('../notificaciones/notificaciones.service');

const pool = require('../../config/db');
const app = require('../../app');
const { OPCIONES, RADIO_FIELDS, SCALE_FIELDS } = require('./spe.registro.validation');
const { ESTADO_CARGA, MODULO } = require('../../config/estados');
const notificaciones = require('../notificaciones/notificaciones.service');

const token = (role = 'encuestador') =>
  jwt.sign({ userId: 9, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

function encuesta(cambios = {}) {
  const datos = { eventId: 5 };
  Object.entries(OPCIONES).forEach(([campo, opciones]) => { datos[campo] = opciones[0]; });
  RADIO_FIELDS.forEach((campo) => { datos[campo] = 'No'; });
  SCALE_FIELDS.forEach((campo) => { datos[campo] = 3; });
  Object.assign(datos, { exportSector: 'Textiles', mainDestination: 'CAN', accessModality: 'Distribuidores', bestTradeAgreement: 'CAN' });
  return { ...datos, ...cambios };
}

let conexion;
beforeEach(() => {
  jest.clearAllMocks();
  conexion = {
    beginTransaction: jest.fn(),
    query: jest.fn().mockResolvedValueOnce([{ insertId: 50 }]).mockResolvedValueOnce([{ insertId: 60 }]),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(conexion);
});

describe('POST /api/spe/encuestas', () => {
  it('guarda la encuesta pendiente, con el evento y el período de la fecha del evento', async () => {
    pool.query.mockResolvedValueOnce([[{ year: 2026, quarter: 4, semester: 2 }]]);
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token()}`).send(encuesta());

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ dataLoadId: 50, periodo: { year: 2026, semester: 2 } }));
    const [, paramsCarga] = conexion.query.mock.calls[0];
    expect(paramsCarga).toContain(ESTADO_CARGA.PENDIENTE);
    const [, paramsRespuesta] = conexion.query.mock.calls[1];
    expect(paramsRespuesta.slice(0, 5)).toEqual([50, 2026, 2, 9, 5]); // carga, año, semestre, encuestador, evento
    expect(conexion.commit).toHaveBeenCalled();
    expect(notificaciones.encuestaPendiente).toHaveBeenCalledWith({ modulo: MODULO.SPE, dataLoadId: 50, encuestadorId: 9, eventId: 5 });
  });

  it('no calcula índices: eso pasa recién al aprobarla', async () => {
    pool.query.mockResolvedValueOnce([[{ year: 2026, quarter: 4, semester: 2 }]]);
    await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token()}`).send(encuesta());
    expect(conexion.query).toHaveBeenCalledTimes(2);
  });

  it('si el evento no está asignado o no habilita SPE responde 400 sin guardar', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token()}`).send(encuesta());
    expect(res.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
    expect(notificaciones.encuestaPendiente).not.toHaveBeenCalled();
  });

  it('el encuestador no puede mandar el período (lo da el evento)', async () => {
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token()}`).send(encuesta({ year: 2020, semester: 1 }));
    expect(res.status).toBe(400);
  });

  it('rechaza opciones que no son las del instrumento', async () => {
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token()}`).send(encuesta({ yearsExporting: '8' }));
    expect(res.status).toBe(400);
    expect(res.body.detalles.fieldErrors.yearsExporting).toBeDefined();
  });

  it('solo el encuestador puede usarla', async () => {
    const res = await request(app).post('/api/spe/encuestas').set('Authorization', `Bearer ${token('superadmin')}`).send(encuesta());
    expect(res.status).toBe(403);
  });
});
