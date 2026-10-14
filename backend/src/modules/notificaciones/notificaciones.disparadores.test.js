const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Qué acción dispara cada aviso por correo (eventos, aprobaciones y contraseña).
// Las postulaciones y las encuestas pendientes se prueban en sus propios tests.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('./notificaciones.service');
jest.mock('../ica/ica.scoring.service', () => ({ recalcularAgregadoIca: jest.fn() }));
jest.mock('../spe/spe.indices.service', () => ({
  ...jest.requireActual('../spe/spe.indices.service'),
  calcularIndicesSpe: jest.fn(),
}));

const pool = require('../../config/db');
const notificaciones = require('./notificaciones.service');
const app = require('../../app');

const token = (role, campusId = 1, userId = 7) =>
  jwt.sign({ userId, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

const FUTURA = '2099-12-31';
const EVENTO = {
  event_id: 5, campus_id: 1, campus_name: 'Cochabamba', title: 'Feria', fecha: FUTURA, hora: '10:00', modality: 1,
  available_slots: 30, location: 'Campus Tiquipaya', description: 'x', external_link: null, has_ica: 1, has_spe: 0, image_id: null,
};
const DATOS_EVENTO = {
  titulo: 'Feria', fecha: FUTURA, hora: '10:00', modalidad: '1', lugar: 'Campus Tiquipaya', hasIca: 'true', hasSpe: 'false',
};

let conexion;
let avisarCancelacion;
beforeEach(() => {
  jest.resetAllMocks();
  conexion = {
    query: jest.fn().mockResolvedValue([{ insertId: 50, affectedRows: 1 }]),
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
  };
  pool.getConnection.mockResolvedValue(conexion);
  avisarCancelacion = jest.fn();
  notificaciones.prepararAvisoCancelacion.mockResolvedValue(avisarCancelacion);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

describe('eventos', () => {
  it('crear un evento avisa a los encuestadores (el servicio decide si tiene encuesta)', async () => {
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token('admin')}`).send(DATOS_EVENTO);
    expect(res.status).toBe(201);
    expect(notificaciones.nuevoEvento).toHaveBeenCalledWith(50);
  });

  it('un evento inválido no avisa', async () => {
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token('admin')}`).send({ titulo: '' });
    expect(res.status).toBe(400);
    expect(notificaciones.nuevoEvento).not.toHaveBeenCalled();
  });

  it('editar pasa el evento como estaba antes, para comparar fecha, hora, lugar y modalidad', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 1 }]]).mockResolvedValueOnce([[EVENTO]]);
    const res = await request(app).patch('/api/events/5').set('Authorization', `Bearer ${token('admin')}`).send({ ...DATOS_EVENTO, lugar: 'Auditorio' });
    expect(res.status).toBe(200);
    expect(notificaciones.eventoCambiado).toHaveBeenCalledWith(5, expect.objectContaining({ lugar: 'Campus Tiquipaya', fecha: FUTURA }));
  });

  it('eliminar lee a quién avisar ANTES de la baja y avisa después', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 1 }]]);
    notificaciones.prepararAvisoCancelacion.mockImplementation(async () => {
      expect(conexion.commit).not.toHaveBeenCalled(); // todavía no se dio de baja
      return avisarCancelacion;
    });
    const res = await request(app).delete('/api/events/5').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(200);
    expect(notificaciones.prepararAvisoCancelacion).toHaveBeenCalledWith(5);
    expect(avisarCancelacion).toHaveBeenCalled();
  });

  it('asignar un encuestador le avisa a él', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_id: 1 }]])
      .mockResolvedValueOnce([[EVENTO]])
      .mockResolvedValueOnce([[{ 1: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).post('/api/events/5/encuestadores').set('Authorization', `Bearer ${token('admin')}`).send({ userId: 13 });
    expect(res.status).toBe(201);
    expect(notificaciones.asignadoAEvento).toHaveBeenCalledWith({ eventId: 5, userId: 13 });
  });
});

describe('aprobación de encuestas', () => {
  it('rechazar una encuesta ICA avisa al encuestador con el motivo', async () => {
    conexion.query
      .mockResolvedValueOnce([[{ data_load_id: 10, status: 1 }]])
      .mockResolvedValueOnce([[{ community_id: 3, year: 2026, quarter: 4, campus_id: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .patch('/api/ica/cargas/10/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ estado: 'rechazada', motivo: 'Faltan respuestas' });
    expect(res.status).toBe(200);
    expect(notificaciones.encuestaRevisada).toHaveBeenCalledWith({ dataLoadId: 10, aprobada: false, motivo: 'Faltan respuestas' });
  });

  it('aprobar una encuesta SPE avisa al encuestador', async () => {
    conexion.query
      .mockResolvedValueOnce([[{ data_load_id: 11, status: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .patch('/api/spe/cargas/11/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ estado: 'aprobada' });
    expect(res.status).toBe(200);
    expect(notificaciones.encuestaRevisada).toHaveBeenCalledWith({ dataLoadId: 11, aprobada: true, motivo: null });
  });

  it('si la encuesta ya estaba revisada (409) no se avisa', async () => {
    conexion.query.mockResolvedValueOnce([[{ data_load_id: 11, status: 2 }]]);
    const res = await request(app)
      .patch('/api/spe/cargas/11/estado')
      .set('Authorization', `Bearer ${token('superadmin')}`)
      .send({ estado: 'aprobada' });
    expect(res.status).toBe(409);
    expect(notificaciones.encuestaRevisada).not.toHaveBeenCalled();
  });
});

describe('contraseña', () => {
  it('cambiarla desde el perfil manda el aviso de seguridad', async () => {
    const hash = await bcrypt.hash('Actual123', 4);
    pool.query.mockResolvedValueOnce([[{ password_hash: hash }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token('admin', 1, 20)}`)
      .send({ currentPassword: 'Actual123', newPassword: 'NuevaClave9' });
    expect(res.status).toBe(200);
    expect(notificaciones.contrasenaCambiada).toHaveBeenCalledWith(20);
  });

  it('con la contraseña actual incorrecta no se avisa', async () => {
    const hash = await bcrypt.hash('Actual123', 4);
    pool.query.mockResolvedValueOnce([[{ password_hash: hash }]]);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token('admin', 1, 20)}`)
      .send({ currentPassword: 'Otra1234', newPassword: 'NuevaClave9' });
    expect(res.status).toBe(401);
    expect(notificaciones.contrasenaCambiada).not.toHaveBeenCalled();
  });

  it('restablecerla con el token de recuperación también avisa', async () => {
    const resetToken = jwt.sign({ userId: 20, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).post('/api/auth/reset-password').send({ resetToken, newPassword: 'NuevaClave9' });
    expect(res.status).toBe(200);
    expect(notificaciones.contrasenaCambiada).toHaveBeenCalledWith(20);
  });
});
