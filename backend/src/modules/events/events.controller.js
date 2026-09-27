// Santiago — US43 (listado), US44 (registro), US45 (editar), US46 (eliminar),
// US47 (detalle), US55 (asignar encuestadores).
// Tablas: event, event_surveyor, image (type = TIPO_IMAGEN.EVENTO).
// El evento indica qué encuestas se toman con has_ica / has_spe (0/1, pueden ser las dos
// o ninguna). Un Admin solo puede marcar has_ica; has_spe es solo del Superadmin.
// Solo se asignan encuestadores a eventos con al menos una de las dos en 1.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getEventos: pendiente('US43', 'Santiago'),
  getEvento: pendiente('US47', 'Santiago'),
  postEvento: pendiente('US44', 'Santiago'),
  patchEvento: pendiente('US45', 'Santiago'),
  deleteEvento: pendiente('US46', 'Santiago'),
  getEncuestadoresEvento: pendiente('US55', 'Santiago'),
  postAsignarEncuestador: pendiente('US55', 'Santiago'),
  deleteAsignacionEncuestador: pendiente('US55', 'Santiago'),
};
