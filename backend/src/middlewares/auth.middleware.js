const jwt = require('jsonwebtoken');

// Lee el JWT del header "Authorization: Bearer <token>", lo valida y
// adjunta el payload a req.user — así cualquier endpoint protegido sabe
// quién hace la petición sin volver a consultar la base de datos.
// Esta es la validación REAL (el ProtectedRoute del frontend es solo UX).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role, campusId: payload.campusId };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Para endpoints públicos que igual se comportan distinto si hay sesión
// (ej. dashboard ICA: un visitante ve todas las sedes, un Admin la suya).
// Sin header → sigue como visitante (req.user = null). Con header pero token
// inválido/vencido → 401, así el frontend dispara el aviso de sesión expirada
// en vez de mostrarle datos de visitante a alguien que creía estar logueado.
function optionalAuth(req, res, next) {
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, next);
}

// requireRole('superadmin', 'admin') — se usa DESPUÉS de requireAuth en la
// cadena de middlewares. Filtra por rol, igual que RoleGate/ProtectedRoute
// en el frontend, pero acá sí hace cumplir el permiso de verdad.
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
    }
    return next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
