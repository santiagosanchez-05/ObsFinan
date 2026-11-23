const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const app = require('../../app');

const token = (role) => jwt.sign({ userId: 1, role, campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });

const mockConexion = () => {
  const conexion = {
    query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn().mockResolvedValue(),
  };
  pool.getConnection.mockResolvedValue(conexion);
  return conexion;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('US40 — Descarga de datos SPE pública (GET /api/spe/export)', () => {
  it('exporta en JSON correctamente sin requerir autenticación', async () => {
    const mockRows = [
      {
        id: 1,
        year: 2026,
        semester: 1,
        departamento: 'Santa Cruz',
        sectorExportador: 'Agroindustria',
        tamanoEmpresa: 'Grande',
        iee: 75.5,
        ice: 80.0,
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/spe/export?formato=json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment; filename="dataset_spe.json"');
    expect(res.body).toEqual(mockRows);
  });

  it('exporta en CSV con cabeceras y delimitador punto y coma', async () => {
    const mockRows = [
      {
        id: 1,
        departamento: 'La Paz',
        sector: 'Manufactura',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app).get('/api/spe/export?formato=csv');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="dataset_spe.csv"');
    expect(res.text).toContain('id;departamento;sector');
    expect(res.text).toContain('1;La Paz;Manufactura');
  });

  it('exporta en XLSX formateado por casillas sin requerir autenticación', async () => {
    const mockRows = [
      {
        id: 1,
        year: 2026,
        semester: 1,
        departamento: 'Santa Cruz',
        sectorExportador: 'Agroindustria',
      },
    ];
    pool.query.mockResolvedValueOnce([mockRows]);

    const res = await request(app)
      .get('/api/spe/export?formato=xlsx')
      .parse((res, cb) => {
        const bufs = [];
        res.on('data', (chunk) => bufs.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(bufs)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="dataset_spe_\d{4}-\d{2}-\d{2}\.xlsx"/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('rechaza formatos no soportados con 400', async () => {
    const res = await request(app).get('/api/spe/export?formato=xml');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Formato inválido/i);
  });

  it('aplica filtros de año, semestre y departamento', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/spe/export?year=2026&semester=1&department=Cochabamba&sector=Textiles&size=Mediana');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sqlQuery, params] = pool.query.mock.calls[0];
    expect(sqlQuery).toContain('sr.year = ?');
    expect(sqlQuery).toContain('sr.s1_department = ?');
    expect(params).toContain(2026);
    expect(params).toContain(1);
    expect(params).toContain('Cochabamba');
    expect(params).toContain('Textiles');
    expect(params).toContain('Mediana');
  });

  it('retorna vacío si no existen registros aprobados', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/spe/export?formato=json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('US41 — Detalle de un registro SPE (GET /api/spe/registros/:id)', () => {
  it('retorna 400 si el ID es inválido', async () => {
    const res = await request(app)
      .get('/api/spe/registros/abc')
      .set('Authorization', `Bearer ${token('superadmin')}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);
  });

  it('retorna 404 si el registro no existe o fue eliminado', async () => {
    pool.query.mockResolvedValueOnce([[]]); // sin cargas encontradas

    const res = await request(app)
      .get('/api/spe/registros/999')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no se encontró/i);
  });

  it('retorna metadatos y respuestas del registro para superadmin', async () => {
    const mockCarga = {
      data_load_id: 10,
      source_type: 1,
      file_name: 'Registro individual',
      total_rows: 1,
      status: 2,
      created_at: '2026-03-01T12:00:00.000Z',
      first_name: 'Santiago',
      paternal_last_name: 'Admin',
    };
    const mockRespuestas = [
      { spe_survey_response_id: 101, s1_department: 'Santa Cruz', s1_export_sector: 'Agroindustria' },
    ];

    pool.query
      .mockResolvedValueOnce([[mockCarga]])
      .mockResolvedValueOnce([mockRespuestas]);

    const res = await request(app)
      .get('/api/spe/registros/10')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.archivo).toEqual(
      expect.objectContaining({
        id: 10,
        nombre: 'Registro individual',
        evento: 'Registro individual',
        subidoPor: 'Santiago Admin',
        totalRegistros: 1,
        estado: 'aprobada',
      })
    );
    expect(res.body.registros).toHaveLength(1);
  });

  it('incluye el nombre del evento cuando la encuesta se registró desde Mis eventos', async () => {
    const mockCarga = {
      data_load_id: 11,
      source_type: 1,
      file_name: 'Registro individual',
      total_rows: 1,
      status: 2,
      created_at: '2026-03-01T12:00:00.000Z',
      first_name: 'Ana',
      paternal_last_name: 'Encuestadora',
    };

    pool.query
      .mockResolvedValueOnce([[mockCarga]])
      .mockResolvedValueOnce([[{ spe_survey_response_id: 102, event_id: 5, evento: 'Feria financiera' }]]);

    const res = await request(app)
      .get('/api/spe/registros/11')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.archivo.evento).toBe('Feria financiera');
  });
});

describe('US42 — Eliminación de un registro SPE (DELETE /api/spe/:id)', () => {
  it('elimina un registro individual SPE con éxito', async () => {
    const conexion = mockConexion();
    conexion.query
      .mockResolvedValueOnce([[{ data_load_id: 50 }]]) // SELECT data_load
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE spe_survey_response
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE data_load

    const res = await request(app)
      .delete('/api/spe/50')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado correctamente/i);
    expect(conexion.commit).toHaveBeenCalled();
  });

  it('retorna 404 al intentar eliminar un registro inexistente', async () => {
    const conexion = mockConexion();
    conexion.query.mockResolvedValueOnce([[]]); // no existe la carga individual

    const res = await request(app)
      .delete('/api/spe/9999')
      .set('Authorization', `Bearer ${token('superadmin')}`);

    expect(res.status).toBe(404);
    expect(conexion.rollback).toHaveBeenCalled();
  });
});
