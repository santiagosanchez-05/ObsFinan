// backend/src/modules/users/users.encuestadores.validation.js
const { z } = require("zod");
const { campoNombre, campoNombreOpcional, campoCorreo } = require("../../utils/validacionesComunes");

const encuestadorSchema = z.object({
  nombre: campoNombre("El nombre"),
  apellidoPaterno: campoNombre("El apellido paterno"),
  apellidoMaterno: campoNombreOpcional("El apellido materno"),
  correo: campoCorreo(),
  // Solo la usa el Superadmin: al Admin se le fuerza su sede en el controlador.
  campusId: z.coerce.number().int().positive("La sede es obligatoria").optional(),
});

module.exports = { encuestadorSchema };
