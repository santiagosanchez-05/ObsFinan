// Kevin Alanes — US54 (registro directo de un encuestador, sin convocatoria).
// - Superadmin: en cualquier sede. Admin: SOLO en la suya (forzar
//   campusId = req.user.campusId, no confiar en lo que mande el formulario).
// - El rol siempre es 'encuestador' (un Admin no puede crear admins).
// - Reutiliza registrarUsuario de ./users.service.js (contraseña temporal +
//   correo de bienvenida) — importalo, no lo modifiques ni lo copies.
// Crea tu users.encuestadores.validation.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  postRegistrarEncuestador: pendiente('US54', 'Kevin Alanes'),
};
