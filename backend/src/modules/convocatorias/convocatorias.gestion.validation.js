// backend/src/modules/convocatorias/convocatorias.gestion.validation.js
const { z } = require("zod");

const convocatoriaSchema = z
  .object({
    campus_id: z.coerce.number().int().positive("El campus es obligatorio"),
    title: z
      .string()
      .trim()
      .min(1, "El título es obligatorio")
      .max(150, "El título es demasiado largo"),
    start_date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Fecha de inicio inválida"),
    end_date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), "Fecha de fin inválida"),
    description: z
      .string()
      .trim()
      .max(2000, "La descripción es demasiado larga")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: "La fecha de fin debe ser posterior o igual a la de inicio",
    path: ["end_date"],
  });

// US53 — validación para aprobar/rechazar un postulante.
const patchPostulanteSchema = z.object({
  status: z.union(
    [
      z.literal(2), // APROBADO
      z.literal(3), // RECHAZADO
    ],
    { message: "Status inválido (2 = aprobado, 3 = rechazado)" },
  ),
});

module.exports = { convocatoriaSchema, patchPostulanteSchema };
