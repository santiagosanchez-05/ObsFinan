const { puedeGestionarSede, sedeDeGestion, requireSedeDelRecurso } = require('./sede.middleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('puedeGestionarSede', () => {
  it('el Superadmin gestiona cualquier sede', () => {
    expect(puedeGestionarSede({ role: 'superadmin', campusId: 1 }, 2)).toBe(true);
  });

  it('un Admin solo gestiona su propia sede', () => {
    expect(puedeGestionarSede({ role: 'admin', campusId: 1 }, 1)).toBe(true);
    expect(puedeGestionarSede({ role: 'admin', campusId: 1 }, '1')).toBe(true);
    expect(puedeGestionarSede({ role: 'admin', campusId: 1 }, 2)).toBe(false);
  });

  it('sin usuario o sin sede del recurso, no', () => {
    expect(puedeGestionarSede(null, 1)).toBe(false);
    expect(puedeGestionarSede({ role: 'admin', campusId: 1 }, null)).toBe(false);
  });
});

describe('sedeDeGestion', () => {
  it('Superadmin sin ?campusId trabaja sobre todas las sedes (null)', () => {
    expect(sedeDeGestion({ user: { role: 'superadmin', campusId: 1 }, query: {} })).toBeNull();
  });

  it('Superadmin puede elegir una sede por query', () => {
    expect(sedeDeGestion({ user: { role: 'superadmin', campusId: 1 }, query: { campusId: '3' } })).toBe(3);
  });

  it('un Admin queda fijo en su sede aunque pida otra', () => {
    expect(sedeDeGestion({ user: { role: 'admin', campusId: 1 }, query: { campusId: '3' } })).toBe(1);
  });
});

describe('requireSedeDelRecurso', () => {
  it('deja pasar si el recurso es de su sede', async () => {
    const next = jest.fn();
    const res = mockRes();
    await requireSedeDelRecurso(async () => 1)({ user: { role: 'admin', campusId: 1 } }, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('403 si el recurso es de otra sede', async () => {
    const next = jest.fn();
    const res = mockRes();
    await requireSedeDelRecurso(async () => 2)({ user: { role: 'admin', campusId: 1 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('404 si el recurso no existe', async () => {
    const next = jest.fn();
    const res = mockRes();
    await requireSedeDelRecurso(async () => null)({ user: { role: 'superadmin', campusId: 1 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('500 si falla la consulta de la sede', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const next = jest.fn();
    const res = mockRes();
    await requireSedeDelRecurso(async () => { throw new Error('BD caída'); })({ user: { role: 'admin', campusId: 1 } }, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});
