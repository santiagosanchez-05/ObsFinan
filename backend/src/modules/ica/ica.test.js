const request = require('supertest');
const jwt = require('jsonwebtoken');

// Estos tests cubren las RUTAS del módulo ICA (permisos, acceso público,
// validación y qué se le pasa al servicio). El servicio se mockea entero:
// sus queries dependen de la estructura real de la BD.
jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('./ica.service');

const icaService = require('./ica.service');
const app = require('../../app');

function token(role, campusId = 1) {
  return jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const DASHBOARD_VACIO = { periodo: null, comunas: [], dimensiones: [], brechas: [], metricas: null };

const REGISTRO_VALIDO = {
  communityId: 1,
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

describe('GET /api/ica (dashboard público — US16)', () => {
  it('sin sesión responde 200 y muestra todas las sedes', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    const res = await request(app).get('/api/ica');

    expect(res.status).toBe(200);
    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ campusId: null, mostrarTodasSedes: true }),
    );
  });

  it('el visitante puede filtrar por sede (US29)', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    await request(app).get('/api/ica?campusId=2');

    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(expect.objectContaining({ campusId: 2 }));
  });

  it('pasa los filtros de trimestre, comuna, dimensión y género al servicio (US28/US30)', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    await request(app).get('/api/ica?year=2025&quarter=3&communityId=4&dimension=Uso&gender=mujeres');

    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2025, quarter: 3, communityId: 4, dimension: 'Uso', genero: 'mujeres' }),
    );
  });

  it('ignora un género que no sea hombres/mujeres', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    await request(app).get('/api/ica?gender=otro');

    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(expect.objectContaining({ genero: null }));
  });

  it('un Admin queda fijo en su sede aunque pida otra por query', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    await request(app).get('/api/ica?campusId=5').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ campusId: 1, mostrarTodasSedes: false }),
    );
  });

  it('un Superadmin puede elegir cualquier sede', async () => {
    icaService.obtenerDashboard.mockResolvedValue(DASHBOARD_VACIO);

    await request(app).get('/api/ica?campusId=3').set('Authorization', `Bearer ${token('superadmin', 1)}`);

    expect(icaService.obtenerDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ campusId: 3, mostrarTodasSedes: true }),
    );
  });

  it('con un token inválido responde 401 (no lo trata como visitante)', async () => {
    const res = await request(app).get('/api/ica').set('Authorization', 'Bearer token-roto');
    expect(res.status).toBe(401);
    expect(icaService.obtenerDashboard).not.toHaveBeenCalled();
  });

  it('si el servicio falla, responde 500', async () => {
    icaService.obtenerDashboard.mockRejectedValue(new Error('BD caída'));
    const res = await request(app).get('/api/ica');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/ica/questions (explorador de preguntas, público)', () => {
  it('sin sesión responde 200', async () => {
    icaService.obtenerExploradorPreguntas.mockResolvedValue({ periodo: null, total: 0, preguntas: [] });

    const res = await request(app).get('/api/ica/questions');

    expect(res.status).toBe(200);
    expect(res.body.preguntas).toEqual([]);
  });
});

describe('GET /api/ica/export (US22 — descarga pública)', () => {
  const DATASET = [
    { comuna: 'Tunari', year: 2025, quarter: 1, conocimiento: 60, uso: 50, educacion: 40, prevision: 70, icaHombres: 55, icaMujeres: 45, icaGeneral: 55 },
  ];

  it('descarga en JSON sin sesión', async () => {
    icaService.obtenerDatasetIcaExport.mockResolvedValue(DATASET);

    const res = await request(app).get('/api/ica/export?formato=json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('dataset_ica.json');
  });

  it('descarga en CSV con encabezados y separador ;', async () => {
    icaService.obtenerDatasetIcaExport.mockResolvedValue(DATASET);

    const res = await request(app).get('/api/ica/export?formato=csv');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.split('\n')[0]).toBe('comuna;year;quarter;conocimiento;uso;educacion;prevision;icaHombres;icaMujeres;icaGeneral');
    expect(res.text).toContain('Tunari');
  });

  it('con un formato inválido responde 400', async () => {
    const res = await request(app).get('/api/ica/export?formato=xml');
    expect(res.status).toBe(400);
  });
});

describe('Endpoints de gestión ICA siguen protegidos', () => {
  it.each([
    ['get', '/api/ica/comunidades'],
    ['get', '/api/ica/historial'],
    ['get', '/api/ica/files/1'],
    ['get', '/api/ica/survey-export'],
    ['post', '/api/ica'],
    ['post', '/api/ica/upload'],
    ['delete', '/api/ica/1'],
    ['put', '/api/ica/files/1/verify'],
  ])('%s %s sin sesión responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it('un rol sin permiso (encuestador) no puede ver el historial (US21)', async () => {
    const res = await request(app).get('/api/ica/historial').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(403);
  });

  it('un Admin no puede verificar cargas (solo Superadmin)', async () => {
    const res = await request(app).put('/api/ica/files/1/verify').set('Authorization', `Bearer ${token('admin')}`);
    expect(res.status).toBe(403);
  });

  it('el historial de un Admin se pide siempre sobre su propia sede', async () => {
    icaService.obtenerHistorialIca.mockResolvedValue({ registros: [], total: 0 });

    await request(app).get('/api/ica/historial?campusId=9').set('Authorization', `Bearer ${token('admin', 1)}`);

    expect(icaService.obtenerHistorialIca).toHaveBeenCalledWith(expect.objectContaining({ campusId: 1 }));
  });
});

describe('POST /api/ica (registro individual — US18)', () => {
  it('con datos inválidos responde 400', async () => {
    const res = await request(app)
      .post('/api/ica')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ ...REGISTRO_VALIDO, conocimiento: 150 });

    expect(res.status).toBe(400);
    expect(icaService.registrarRegistroIndividual).not.toHaveBeenCalled();
  });

  it('guarda el registro con la sede del token y el rol de quien carga (entra verificado)', async () => {
    icaService.registrarRegistroIndividual.mockResolvedValue({ dataLoadId: 11 });

    const res = await request(app)
      .post('/api/ica')
      .set('Authorization', `Bearer ${token('admin', 1)}`)
      .send(REGISTRO_VALIDO);

    expect(res.status).toBe(201);
    expect(icaService.registrarRegistroIndividual).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, campusId: 1, rol: 'admin' }),
    );
  });

  it('si la comuna no es de su sede responde 400', async () => {
    icaService.registrarRegistroIndividual.mockRejectedValue(new Error('COMUNIDAD_NO_ENCONTRADA'));

    const res = await request(app)
      .post('/api/ica')
      .set('Authorization', `Bearer ${token('admin')}`)
      .send(REGISTRO_VALIDO);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/ica/upload (US19/US20)', () => {
  it('sin archivo responde 400', async () => {
    const res = await request(app)
      .post('/api/ica/upload')
      .set('Authorization', `Bearer ${token('admin')}`)
      .field('communityId', '1')
      .field('quarter', '1')
      .field('year', '2025');

    expect(res.status).toBe(400);
  });

  it('con encabezados incorrectos responde 400 marcando formato inválido', async () => {
    const err = new Error('ENCABEZADOS_INVALIDOS');
    icaService.parsearArchivoIca.mockImplementation(() => { throw err; });

    const res = await request(app)
      .post('/api/ica/upload')
      .set('Authorization', `Bearer ${token('admin')}`)
      .field('communityId', '1')
      .field('quarter', '1')
      .field('year', '2025')
      .attach('archivo', Buffer.from('xx'), 'encuestas.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.tipo).toBe('formato_invalido');
  });

  it('carga las filas válidas pasando el rol de quien sube el archivo', async () => {
    icaService.parsearArchivoIca.mockReturnValue([{ fila: 1 }]);
    icaService.validarFilas.mockReturnValue({ filasValidas: [{ fila: 1 }], errores: [] });
    icaService.registrarCargaPorArchivo.mockResolvedValue({ dataLoadId: 20, totalInsertados: 1 });

    const res = await request(app)
      .post('/api/ica/upload')
      .set('Authorization', `Bearer ${token('superadmin', 1)}`)
      .field('communityId', '1')
      .field('quarter', '1')
      .field('year', '2025')
      .attach('archivo', Buffer.from('xx'), 'encuestas.xlsx');

    expect(res.status).toBe(201);
    expect(res.body.filasInsertadas).toBe(1);
    expect(icaService.registrarCargaPorArchivo).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'superadmin', communityId: 1, quarter: 1, year: 2025 }),
    );
  });
});

describe('estadoInicialCarga (estado con el que entra una carga nueva)', () => {
  const { estadoInicialCarga } = jest.requireActual('./ica.service');

  it('lo que carga un Admin o un Superadmin entra directo como verificado (2)', () => {
    expect(estadoInicialCarga('admin')).toBe(2);
    expect(estadoInicialCarga('superadmin')).toBe(2);
  });

  it('cualquier otro rol (ej. encuestador, Sprint 2) queda pendiente de verificación (1)', () => {
    expect(estadoInicialCarga('encuestador')).toBe(1);
    expect(estadoInicialCarga(undefined)).toBe(1);
  });
});

describe('Sprint 2 — rutas de aprobación ICA (US58/US59)', () => {
  it.each([
    ['get', '/api/ica/pendientes'],
    ['patch', '/api/ica/cargas/1/estado'],
  ])('%s %s sin sesión responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
  });

  it('un encuestador no puede aprobar encuestas', async () => {
    const res = await request(app).patch('/api/ica/cargas/1/estado').set('Authorization', `Bearer ${token('encuestador')}`);
    expect(res.status).toBe(403);
  });

  it('Admin y Superadmin pueden entrar a la bandeja', async () => {
    for (const rol of ['admin', 'superadmin']) {
      const res = await request(app).get('/api/ica/pendientes').set('Authorization', `Bearer ${token(rol)}`);
      expect([401, 403]).not.toContain(res.status);
    }
  });
});
