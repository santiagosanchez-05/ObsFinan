// Kevin Alanes — US50 (crear convocatoria) y US53 (revisar/aprobar/rechazar postulantes).
// Tablas: convocation, applicant. Al aprobar un postulante se le crea la
// cuenta de encuestador reutilizando registrarUsuario de
// modules/users/users.service.js (importarlo, no copiarlo) y se guarda
// applicant.user_id + status = ESTADO_POSTULANTE.APROBADO.
// Crea tu convocatorias.gestion.service.js y .validation.js al implementar.
const pendiente = require('../../utils/pendiente');

module.exports = {
  postConvocatoria: pendiente('US50', 'Kevin Alanes'),
  getPostulantes: pendiente('US53', 'Kevin Alanes'),
  patchPostulante: pendiente('US53', 'Kevin Alanes'),
};
