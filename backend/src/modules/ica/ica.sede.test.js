const request = require('supertest');
const jwt = require('jsonwebtoken');

// Control de acceso por sede en la gestión del ICA (Santiago — US65):
// el Superadmin trabaja sobre cualquier sede y el Admin solo sobre la suya.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('./ica.service');

const icaService = require('./ica.service');
const app = require('../../app');

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });

const REGISTRO_VALIDO = {
  communityId: 3,
  quarter: 2,
  year: 2025,
  conocimiento: 60,
  uso: 55,
  educacion: 40,
  prevision: 70,
  icaHombres: 58,
  icaMujeres: 52,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('Superadmin: gestión del ICA de todas las sedes', () => {
  it('el historial sin filtro trae todas las sedes (campusId null)', async () => {
    icaService.obtenerHistorialIca.mockResolvedValue({ registros: [], total: 0 });
    const res = await request(app).get('/api/ica/historial').set('Authorization', `Bearer ${token('superadmin', 1)}`);
    expect(res.status).toBe(200);
    expect(icaService.obtenerHistorialIca).toHaveBeenCalledWith(expect.objectContaining({ campusId: null }));
  });

  it('el historial puede pedir una sede concreta con ?campusId=', async () => {
    icaService.obtenerHistorialIca.mockResolvedValue({ registros: [], total: 0 });
    await request(app).get('/api/ica/historial?campusId=2').set('Authorization', `Bearer ${token('superadmin', 1)}`);
    expect(icaService.obtenerHistorialIca).toHaveBeenCalledWith(expect.objectContaining({ campusId: 2 }));
  });

  it.each([
    ['get', '/api/ica/files/5', 'obtenerDetalleArchivoIca', { detalle: true }],
    ['delete', '/api/ica/5', 'eliminarRegistroIndividual', undefined],
    ['delete', '/api/ica/files/5', 'eliminarArchivoIca', undefined],
    ['put', '/api/ica/files/5/verify', 'verificarCargaIca', undefined],
  ])('%s %s no se limita a su sede', async (metodo, ruta, funcion, resultado) => {
    icaService[funcion].mockResolvedValue(resultado);
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token('superadmin', 1)}`);
    expect(res.status).toBe(200);
    expect(icaService[funcion]).toHaveBeenCalledWith(expect.objectContaining({ campusId: null, dataLoadId: 5 }));
  });

  it('registra en una comuna de cualquier sede', async () => {
    icaService.registrarRegistroIndividual.mockResolvedValue({ dataLoadId: 11 });
    const res = await request(app)
      .post('/api/ica')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .send(REGISTRO_VALIDO);
    expect(res.status).toBe(201);
    expect(icaService.registrarRegistroIndividual).toHaveBeenCalledWith(
      expect.objectContaining({ campusId: null, communityId: 3, rol: 'superadmin' }),
    );
  });

  it('ve las comunas de todas las sedes, con el nombre de la sede', async () => {
    icaService.obtenerComunidadesPorSede.mockResolvedValue([
      { community_id: 1, community_name: 'Tunari', campus_id: 1, campus_name: 'Cochabamba' },
      { community_id: 9, community_name: 'Sopocachi', campus_id: 2, campus_name: 'La Paz' },
    ]);
    const res = await request(app).get('/api/ica/comunidades').set('Authorization', `Bearer ${token('superadmin', 1)}`);
    expect(res.status).toBe(200);
    expect(icaService.obtenerComunidadesPorSede).toHaveBeenCalledWith(null);
    expect(res.body.comunidades[1]).toEqual({ id: 9, nombre: 'Sopocachi', campusId: 2, sede: 'La Paz' });
  });
});

describe('Admin: solo su sede', () => {
  it.each([
    ['get', '/api/ica/files/5?campusId=2', 'obtenerDetalleArchivoIca', { detalle: true }],
    ['delete', '/api/ica/5?campusId=2', 'eliminarRegistroIndividual', undefined],
  ])('%s %s usa siempre su sede aunque pida otra', async (metodo, ruta, funcion, resultado) => {
    icaService[funcion].mockResolvedValue(resultado);
    await request(app)[metodo](ruta).set('Authorization', `Bearer ${token('admin', 1)}`);
    expect(icaService[funcion]).toHaveBeenCalledWith(expect.objectContaining({ campusId: 1 }));
  });

  it('un Admin sin sede asignada recibe 400', async () => {
    const res = await request(app).get('/api/ica/historial').set('Authorization', `Bearer ${token('admin', null)}`);
    expect(res.status).toBe(400);
    expect(icaService.obtenerHistorialIca).not.toHaveBeenCalled();
  });

  it('un archivo de otra sede no existe para el Admin (404)', async () => {
    icaService.obtenerDetalleArchivoIca.mockRejectedValue(new Error('ARCHIVO_NO_ENCONTRADO'));
    const res = await request(app).get('/api/ica/files/5').set('Authorization', `Bearer ${token('admin', 1)}`);
    expect(res.status).toBe(404);
  });
});
