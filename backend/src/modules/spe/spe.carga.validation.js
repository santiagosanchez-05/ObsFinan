// Monserrat — US39. Validación de los query params del historial SPE.
const { z } = require('zod');

const historialSpeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  tipo: z.enum(['individuales', 'archivos']).optional(),
  estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional(),
  periodo: z.string().regex(/^\d{4}-[12]$/, 'Formato esperado: AAAA-S (ej: 2026-2)').optional(),
  busqueda: z.string().trim().max(100).optional(),
  sortBy: z.enum(['sector', 'periodo', 'fecha']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

module.exports = { historialSpeQuerySchema };