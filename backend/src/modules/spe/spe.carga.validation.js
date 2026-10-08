// Monserrat — US39. Validación de los query params del historial SPE.
const { z } = require('zod');

const historialSpeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  semester: z.coerce.number().int().min(1).max(2).optional(),
  departamento: z.string().trim().max(100).optional(),
  busqueda: z.string().trim().max(100).optional(),
  sortBy: z.enum(['sector', 'departamento', 'periodo', 'fecha']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

module.exports = { historialSpeQuerySchema };