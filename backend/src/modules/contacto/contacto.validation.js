const { z } = require('zod');

const contactoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'El nombre es demasiado largo'),
  correo: z.string().trim().email('Correo inválido'),
  institucion: z.string().trim().max(150, 'La institución es demasiado larga').optional().or(z.literal('')),
  sedeId: z.coerce.number().int().positive('Falta seleccionar la sede'),
  asunto: z.string().trim().min(1, 'El asunto es obligatorio').max(150, 'El asunto es demasiado largo'),
  mensaje: z.string().trim().min(1, 'El mensaje es obligatorio').max(3000, 'El mensaje es demasiado largo'),
});

module.exports = { contactoSchema };
