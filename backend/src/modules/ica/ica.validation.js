const { z } = require('zod');

// campusId no va acá: se saca del token en el controller, no del formulario.
const uploadIcaMetaSchema = z.object({
  quarter: z.coerce.number().int().min(1).max(4, { message: 'Trimestre inválido (1-4)' }),
  year: z.coerce.number().int().min(2019).max(new Date().getFullYear()),
});

// Encabezados esperados en la fila 2 del Excel (mismo formato que TABLAS_ICA.xlsx).
const ENCABEZADOS_ESPERADOS = ['Comuna', 'Conocimiento', 'Uso', 'Educación', 'Previsión'];

const filaIcaSchema = z.object({
  comuna: z.string().trim().min(1, 'Falta el nombre de la comuna'),
  conocimiento: z.number().min(0).max(100),
  uso: z.number().min(0).max(100),
  educacion: z.number().min(0).max(100),
  prevision: z.number().min(0).max(100),
  icaHombres: z.number().min(0).max(100),
  icaMujeres: z.number().min(0).max(100),
});

module.exports = { uploadIcaMetaSchema, filaIcaSchema, ENCABEZADOS_ESPERADOS };