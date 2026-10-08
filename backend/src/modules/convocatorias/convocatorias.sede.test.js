const request = require('supertest');
const jwt = require('jsonwebtoken');

// Control de acceso por sede al crear convocatorias (Santiago — US65).
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('./convocatorias.gestion.service');

const gestionService = require('./convocatorias.gestion.service');
const app = require('../../app');

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

const convocatoria = (campus_id) => ({
  campus_id,
  title: 'Encuestadores 2026',
  start_date: '2099-01-01',
  end_date: '2099-01-31',
  description: '',
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/convocatorias — sede', () => {
  it('el Admin no puede crear una convocatoria de otra sede', async () => {
    const res = await request(app)
      .post('/api/convocatorias')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(convocatoria(2));
    expect(res.status).toBe(403);
    expect(gestionService.crearConvocatoria).not.toHaveBeenCalled();
  });

  it('el Admin crea convocatorias de su sede', async () => {
    gestionService.crearConvocatoria.mockResolvedValue({ id: 1 });
    const res = await request(app)
      .post('/api/convocatorias')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(convocatoria(1));
    expect(res.status).toBe(201);
  });

  it('el Superadmin crea convocatorias de cualquier sede', async () => {
    gestionService.crearConvocatoria.mockResolvedValue({ id: 2 });
    const res = await request(app)
      .post('/api/convocatorias')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send(convocatoria(3));
    expect(res.status).toBe(201);
  });
});
