// backend/src/modules/users/users.encuestadores.validation.js
const { z } = require("zod");

const encuestadorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre es demasiado largo"),
  apellidoPaterno: z
    .string()
    .trim()
    .min(1, "El apellido paterno es obligatorio")
    .max(100, "El apellido paterno es demasiado largo"),
  apellidoMaterno: z
    .string()
    .trim()
    .max(100, "El apellido materno es demasiado largo")
    .optional()
    .or(z.literal("")),
  correo: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(150, "El correo es demasiado largo"),
  // Solo la usa el Superadmin: al Admin se le fuerza su sede en el controlador.
  campusId: z.coerce.number().int().positive("La sede es obligatoria").optional(),
});

module.exports = { encuestadorSchema };
