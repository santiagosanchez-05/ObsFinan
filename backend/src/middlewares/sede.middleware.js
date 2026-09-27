// Control de acceso por sede (US65). Regla única para todo el sistema:
//   - Superadmin gestiona cualquier sede.
//   - Admin (y Encuestador) solo lo de su propia sede.
// Usa esto en vez de comparar campusId a mano en cada controlador.

function puedeGestionarSede(user, campusId) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return campusId != null && Number(user.campusId) === Number(campusId);
}

// Sede sobre la que opera un listado de gestión (ej. GET /api/events de un
// Admin, bandeja de aprobación): el Superadmin puede pedir una por query
// (?campusId=) o todas (null); los demás, siempre la suya.
function sedeDeGestion(req) {
  if (req.user?.role === 'superadmin') {
    return req.query.campusId ? Number(req.query.campusId) : null;
  }
  return req.user?.campusId ?? null;
}

// Middleware para rutas sobre UN recurso (/:id): `obtenerCampusId(req)`
// devuelve la sede del recurso (o null si no existe) y el middleware corta
// con 404/403 antes de llegar al controlador.
//
//   router.patch('/:id', requireAuth, requireRole('admin', 'superadmin'),
//     requireSedeDelRecurso((req) => eventsService.obtenerCampusDelEvento(req.params.id)),
//     patchEvento);
function requireSedeDelRecurso(obtenerCampusId) {
  return async (req, res, next) => {
    try {
      const campusId = await obtenerCampusId(req);
      if (campusId == null) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
      }
      if (!puedeGestionarSede(req.user, campusId)) {
        return res.status(403).json({ error: 'No podés gestionar recursos de otra sede' });
      }
      return next();
    } catch (err) {
      console.error('Error al verificar la sede del recurso:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

module.exports = { puedeGestionarSede, sedeDeGestion, requireSedeDelRecurso };
