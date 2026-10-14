// Avisos por correo: a quién le llega cada uno y cuándo NO se manda.
jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('../../config/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));

const pool = require('../../config/db');
const transporter = require('../../config/mailer');
const notificaciones = require('./notificaciones.service');
const { MODULO } = require('../../config/estados');

const EVENTO = {
  event_id: 6, title: 'Feria financiera', fecha: '2026-10-20', hora: '10:00', location: 'Campus Tiquipaya',
  modality: 1, has_ica: 1, has_spe: 0, campus_id: 1, campus_name: 'Cochabamba',
};
const enviado = (n = 0) => transporter.sendMail.mock.calls[n][0];

beforeAll(() => { process.env.NOTIFICAR_EN_TEST = '1'; process.env.MAIL_USER = 'observatorio@test.com'; });
afterAll(() => { delete process.env.NOTIFICAR_EN_TEST; });
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

describe('postulaciones', () => {
  it('nueva postulación → al Admin de la sede de la convocatoria', async () => {
    pool.query
      .mockResolvedValueOnce([[{ convocation_id: 3, title: 'Encuestadores 2026', campus_id: 1, campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ email: 'admin@test.com' }]]);
    await notificaciones.nuevaPostulacion({ convocationId: 3, nombre: 'Ana Paz', correo: 'ana@test.com', telefono: '70000000' });
    expect(enviado().to).toBe('admin@test.com');
    expect(enviado().subject).toBe('Nueva postulación: Encuestadores 2026');
    expect(enviado().html).toContain('Ana Paz');
  });

  it('si la sede no tiene Admin, le llega a los Superadmin (en copia oculta)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ convocation_id: 3, title: 'X', campus_id: 2, campus_name: 'La Paz' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ email: 's1@test.com' }, { email: 's2@test.com' }]]);
    await notificaciones.nuevaPostulacion({ convocationId: 3, nombre: 'Ana', correo: 'a@test.com' });
    expect(enviado().bcc).toEqual(['s1@test.com', 's2@test.com']);
    expect(enviado().to).toBe('observatorio@test.com');
  });

  it('rechazo → al postulante', async () => {
    await notificaciones.postulacionRechazada({ correo: 'ana@test.com', nombre: 'Ana', convocatoria: 'Encuestadores 2026' });
    expect(enviado().to).toBe('ana@test.com');
    expect(enviado().html).toContain('Encuestadores 2026');
  });

  it('escapa el HTML que viene de los usuarios', async () => {
    await notificaciones.postulacionRechazada({ correo: 'a@test.com', nombre: '<script>x</script>', convocatoria: 'C' });
    expect(enviado().html).not.toContain('<script>');
    expect(enviado().html).toContain('&lt;script&gt;');
  });
});

describe('encuestas pendientes', () => {
  it('ICA → Admin de la sede del encuestador y Superadmin', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]]) // nada pendiente reciente: primer aviso
      .mockResolvedValueOnce([[{ nombre: 'Pedro Perez', campus_id: 1, campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[EVENTO]])
      .mockResolvedValueOnce([[{ email: 'admin@test.com' }]])
      .mockResolvedValueOnce([[{ email: 'super@test.com' }]]);
    await notificaciones.encuestaPendiente({ modulo: MODULO.ICA, dataLoadId: 10, encuestadorId: 21, eventId: 6 });
    expect(enviado().bcc).toEqual(['admin@test.com', 'super@test.com']);
    expect(enviado().html).toContain('Feria financiera');
  });

  it('SPE → solo Superadmin', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ nombre: 'Pedro Perez', campus_id: 1, campus_name: 'Cochabamba' }]])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[{ email: 'super@test.com' }]]);
    await notificaciones.encuestaPendiente({ modulo: MODULO.SPE, dataLoadId: 11, encuestadorId: 21, eventId: null });
    expect(enviado().to).toBe('super@test.com');
    const [sql, params] = pool.query.mock.calls[3];
    expect(sql).toContain('role_name = ?');
    expect(params[0]).toBe('superadmin');
  });

  it('agrupa: si ya mandó otra en los últimos 30 minutos, no vuelve a avisar', async () => {
    pool.query.mockResolvedValueOnce([[{ total: 2 }]]);
    await notificaciones.encuestaPendiente({ modulo: MODULO.ICA, dataLoadId: 12, encuestadorId: 21, eventId: 6 });
    expect(transporter.sendMail).not.toHaveBeenCalled();
    expect(pool.query.mock.calls[0][0]).toContain('INTERVAL 30 MINUTE');
  });

  it('revisada → al encuestador, con el motivo si se rechazó', async () => {
    pool.query.mockResolvedValueOnce([[{ module: MODULO.ICA, enviada: '13/10/2026', email: 'pedro@test.com', first_name: 'Pedro', evento: 'Feria' }]]);
    await notificaciones.encuestaRevisada({ dataLoadId: 10, aprobada: false, motivo: 'Faltan respuestas' });
    expect(enviado().to).toBe('pedro@test.com');
    expect(enviado().subject).toBe('Tu encuesta ICA fue rechazada');
    expect(enviado().html).toContain('Faltan respuestas');
  });

  it('revisada: si la cargó un Admin/Superadmin no se avisa a nadie', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await notificaciones.encuestaRevisada({ dataLoadId: 10, aprobada: true });
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });
});

describe('eventos', () => {
  it('nuevo evento con encuesta → encuestadores activos de la sede', async () => {
    pool.query.mockResolvedValueOnce([[EVENTO]]).mockResolvedValueOnce([[{ email: 'e1@test.com' }, { email: 'e2@test.com' }]]);
    await notificaciones.nuevoEvento(6);
    expect(enviado().bcc).toEqual(['e1@test.com', 'e2@test.com']);
    expect(pool.query.mock.calls[1][1]).toEqual(['encuestador', 1, 1]); // rol, activo, sede
  });

  it('nuevo evento SIN encuesta → no se avisa', async () => {
    pool.query.mockResolvedValueOnce([[{ ...EVENTO, has_ica: 0, has_spe: 0 }]]);
    await notificaciones.nuevoEvento(6);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('asignación → al encuestador asignado', async () => {
    pool.query.mockResolvedValueOnce([[EVENTO]]).mockResolvedValueOnce([[{ email: 'pedro@test.com', first_name: 'Pedro' }]]);
    await notificaciones.asignadoAEvento({ eventId: 6, userId: 21 });
    expect(enviado().to).toBe('pedro@test.com');
    expect(enviado().subject).toBe('Te asignaron al evento: Feria financiera');
  });

  it('cambio de fecha → a los encuestadores del evento, con la fecha anterior', async () => {
    pool.query.mockResolvedValueOnce([[EVENTO]]).mockResolvedValueOnce([[{ email: 'pedro@test.com' }]]);
    await notificaciones.eventoCambiado(6, { fecha: '2026-10-18', hora: '10:00', lugar: 'Campus Tiquipaya', modalidad: 1 });
    expect(enviado().to).toBe('pedro@test.com');
    expect(enviado().html).toContain('Fecha anterior');
    expect(enviado().html).not.toContain('Hora anterior');
  });

  it('si solo cambió la descripción no se avisa', async () => {
    pool.query.mockResolvedValueOnce([[EVENTO]]);
    await notificaciones.eventoCambiado(6, { fecha: '2026-10-20', hora: '10:00', lugar: 'Campus Tiquipaya', modalidad: 1 });
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('cancelación: lee los destinatarios antes de la baja y avisa después', async () => {
    pool.query.mockResolvedValueOnce([[EVENTO]]).mockResolvedValueOnce([[{ email: 'pedro@test.com' }]]);
    const avisar = await notificaciones.prepararAvisoCancelacion(6);
    expect(transporter.sendMail).not.toHaveBeenCalled();
    await avisar();
    expect(enviado().subject).toBe('Evento cancelado: Feria financiera');
  });
});

describe('cuenta y errores', () => {
  it('contraseña cambiada → aviso de seguridad al usuario', async () => {
    pool.query.mockResolvedValueOnce([[{ email: 'ana@test.com', first_name: 'Ana' }]]);
    await notificaciones.contrasenaCambiada(5);
    expect(enviado().to).toBe('ana@test.com');
    expect(enviado().subject).toBe('Tu contraseña fue cambiada');
  });

  it('si Gmail falla, no lanza error (la acción ya se guardó)', async () => {
    transporter.sendMail.mockRejectedValueOnce(new Error('SMTP caído'));
    pool.query.mockResolvedValueOnce([[{ email: 'ana@test.com', first_name: 'Ana' }]]);
    await expect(notificaciones.contrasenaCambiada(5)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('en los tests normales (sin NOTIFICAR_EN_TEST) no toca la BD ni manda correos', async () => {
    delete process.env.NOTIFICAR_EN_TEST;
    await notificaciones.contrasenaCambiada(5);
    const avisar = await notificaciones.prepararAvisoCancelacion(6);
    await avisar();
    expect(pool.query).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
    process.env.NOTIFICAR_EN_TEST = '1';
  });
});
