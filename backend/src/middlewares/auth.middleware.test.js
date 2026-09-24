const jwt = require('jsonwebtoken');
const { requireAuth, optionalAuth, requireRole } = require('./auth.middleware');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-test';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  it('sin header Authorization, responde 401', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con header mal formado (sin "Bearer"), responde 401', () => {
    const req = { headers: { authorization: 'token-suelto-sin-bearer' } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con token inválido, responde 401', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con token expirado, responde 401', () => {
    const tokenExpirado = jwt.sign({ userId: 1, role: 'encuestador' }, process.env.JWT_SECRET, {
      expiresIn: -10, // ya vencido
    });
    const req = { headers: { authorization: `Bearer ${tokenExpirado}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con token válido, adjunta req.user y llama a next()', () => {
    const token = jwt.sign(
      { userId: 7, role: 'admin', campusId: 2 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 7, role: 'admin', campusId: 2 });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  it('sin header Authorization, sigue como visitante (req.user = null)', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('con token válido, adjunta req.user', () => {
    const token = jwt.sign({ userId: 4, role: 'superadmin', campusId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 4, role: 'superadmin', campusId: 1 });
  });

  it('con token inválido, responde 401 (no lo trata como visitante)', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('sin req.user (no pasó por requireAuth antes), responde 401', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireRole('superadmin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('con un rol no permitido, responde 403', () => {
    const req = { user: { userId: 3, role: 'encuestador', campusId: 1 } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('superadmin', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('con un rol permitido, llama a next()', () => {
    const req = { user: { userId: 3, role: 'admin', campusId: 1 } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('superadmin', 'admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
