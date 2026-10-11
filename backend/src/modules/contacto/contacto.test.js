const request = require('supertest');

jest.mock('../../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const app = require('../../app');
const { escaparHtml } = require('./contacto.service');

const MENSAJE_VALIDO = {
  nombre: 'María Pérez',
  correo: 'maria@periodico.bo',
  institucion: 'Periódico Los Tiempos',
  sedeId: 1,
  asunto: 'Consulta sobre el ICA',
  mensaje: '¿Dónde puedo ver la metodología?',
};

function post(body) {
  return request(app).post('/api/contacto').send(body);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('GET /api/contacto/sedes', () => {
  it('es público y devuelve las sedes activas de la BD', async () => {
    pool.query.mockResolvedValueOnce([[{ campus_id: 1, campus_name: 'Cochabamba' }]]);

    const res = await request(app).get('/api/contacto/sedes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, nombre: 'Cochabamba' }]);
  });
});

describe('POST /api/contacto (US32)', () => {
  it('es público (no pide login) y le manda el correo al Admin de la sede elegida', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'Cochabamba' }]]) // la sede existe
      .mockResolvedValueOnce([[{ email: 'admin.cbba@univalle.edu' }]]); // su admin

    const res = await post(MENSAJE_VALIDO);

    expect(res.status).toBe(200);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin.cbba@univalle.edu', replyTo: 'maria@periodico.bo' }),
    );
  });

  it('busca SOLO administradores (antes también traía superadmins por role_id = 1)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ email: 'admin.cbba@univalle.edu' }]]);

    await post(MENSAJE_VALIDO);

    const [sqlAdmins, params] = pool.query.mock.calls[1];
    expect(sqlAdmins).toContain("r.role_name = 'admin'");
    expect(sqlAdmins).not.toMatch(/role_id\s*=\s*1/);
    expect(params).toEqual([1]);
  });

  it('si la sede no tiene Admin, le llega a todos los Superadmin', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'La Paz' }]])
      .mockResolvedValueOnce([[]]) // sin admin
      .mockResolvedValueOnce([[{ email: 'super1@univalle.edu' }, { email: 'super2@univalle.edu' }]]);

    const res = await post({ ...MENSAJE_VALIDO, sedeId: 2 });

    expect(res.status).toBe(200);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'super1@univalle.edu, super2@univalle.edu' }),
    );
    expect(transporter.sendMail.mock.calls[0][0].html).toContain('sin administrador asignado');
  });

  it('si la sede no existe o no está activa, responde 400 y no manda nada', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await post({ ...MENSAJE_VALIDO, sedeId: 99 });

    expect(res.status).toBe(400);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ['sin nombre', { nombre: '' }],
    ['correo inválido', { correo: 'no-es-un-correo' }],
    ['sin sede', { sedeId: '' }],
    ['sin asunto', { asunto: '   ' }],
    ['sin mensaje', { mensaje: '' }],
  ])('valida con Zod: %s → 400', async (_caso, cambio) => {
    const res = await post({ ...MENSAJE_VALIDO, ...cambio });
    expect(res.status).toBe(400);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('la institución es opcional', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ email: 'admin.cbba@univalle.edu' }]]);

    const { institucion, ...sinInstitucion } = MENSAJE_VALIDO;
    const res = await post(sinInstitucion);

    expect(res.status).toBe(200);
  });

  it('escapa el HTML que escribe el visitante antes de mandarlo', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ email: 'admin.cbba@univalle.edu' }]]);

    await post({ ...MENSAJE_VALIDO, mensaje: '<a href="http://phishing">clic</a>' });

    const html = transporter.sendMail.mock.calls[0][0].html;
    expect(html).not.toContain('<a href="http://phishing">');
    expect(html).toContain('&lt;a href=&quot;http://phishing&quot;&gt;');
  });

  it('si falla el envío del correo, responde 500', async () => {
    pool.query
      .mockResolvedValueOnce([[{ campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ email: 'admin.cbba@univalle.edu' }]]);
    transporter.sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    const res = await post(MENSAJE_VALIDO);

    expect(res.status).toBe(500);
  });
});

describe('escaparHtml', () => {
  it('escapa los caracteres especiales de HTML', () => {
    expect(escaparHtml(`<b>"Hola" & 'chau'</b>`)).toBe('&lt;b&gt;&quot;Hola&quot; &amp; &#39;chau&#39;&lt;/b&gt;');
  });
});

describe('GET /api/contacto/correo (footer)', () => {
  it('es pública y devuelve el correo del Superadmin activo más antiguo', async () => {
    pool.query.mockResolvedValueOnce([[{ email: 'primero@correo.com' }]]);
    const res = await request(app).get('/api/contacto/correo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ correo: 'primero@correo.com' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain("role_name = 'superadmin' AND u.status = 1");
    expect(sql).toContain('ORDER BY u.created_at ASC');
  });

  it('si no hay Superadmin activo devuelve null', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/contacto/correo');
    expect(res.body).toEqual({ correo: null });
  });
});
