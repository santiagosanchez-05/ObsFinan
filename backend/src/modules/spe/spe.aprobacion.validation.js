const { z } = require('zod');

// review_note en BD es VARCHAR(255).
const MAX_MOTIVO = 255;

const cambioEstadoSpeSchema = z
  .object({
    estado: z.enum(['aprobada', 'rechazada'], {
      errorMap: () => ({ message: "estado debe ser 'aprobada' o 'rechazada'" }),
    }),
    motivo: z.string().trim().max(MAX_MOTIVO, `El motivo no puede superar ${MAX_MOTIVO} caracteres`).optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.estado === 'rechazada' && !datos.motivo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motivo'],
        message: 'El motivo es obligatorio al rechazar',
      });
    }
  });

const idCargaSchema = z.coerce.number().int().positive();

module.exports = { cambioEstadoSpeSchema, idCargaSchema };