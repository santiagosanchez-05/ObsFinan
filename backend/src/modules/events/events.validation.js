const { z } = require('zod');
const { MODALIDAD_EVENTO } = require('../../config/estados');

// El formulario llega como multipart (por la imagen), así que todo viene como
// texto: los booleanos y números se convierten aquí.
const booleano = z.preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean());
const textoOpcional = (max, mensaje) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max, mensaje).optional());

const eventoSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(150, 'Máximo 150 caracteres'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)'),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
  modalidad: z.coerce
    .number()
    .refine((v) => Object.values(MODALIDAD_EVENTO).includes(v), 'Modalidad inválida'),
  lugar: z.string().trim().min(1, 'El lugar es obligatorio').max(255, 'Máximo 255 caracteres'),
  descripcion: textoOpcional(5000, 'Máximo 5000 caracteres'),
  cupos: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int('Los cupos deben ser un número entero').positive('Los cupos deben ser mayores a 0').optional(),
  ),
  enlaceExterno: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z
      .string()
      .trim()
      .max(255, 'Máximo 255 caracteres')
      .url('Enlace inválido')
      .refine((v) => /^https?:\/\//i.test(v), 'El enlace debe empezar con http:// o https://')
      .optional(),
  ),
  hasIca: booleano.default(false),
  hasSpe: booleano.default(false),
  // Solo lo usa el Superadmin; al Admin se le asigna siempre su propia sede.
  campusId: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive('Sede inválida').optional()),
  // Solo al editar: true borra la imagen actual sin subir otra.
  quitarImagen: booleano.default(false),
});

const listarEventosQuerySchema = z.object({
  periodo: z.enum(['proximos', 'pasados', 'todos'], { message: 'Periodo inválido' }).default('proximos'),
  campusId: z.coerce.number().int().positive('Sede inválida').optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive('Página inválida').default(1),
  pageSize: z.coerce.number().int().min(1).max(50, 'Máximo 50 por página').default(12),
  // Solo para el encuestador: eventos con encuesta de su sede a los que puede anotarse.
  disponibles: booleano.default(false),
});

module.exports = { eventoSchema, listarEventosQuerySchema };
