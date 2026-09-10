const { z } = require('zod');

const registrarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().trim().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().trim().optional().or(z.literal('')),
  correo: z.string().trim().email('Correo inválido'),
  rol: z.enum(['superadmin', 'admin', 'cliente'], { message: 'Rol inválido' }),
  campusId: z.coerce.number().int().positive('Falta seleccionar la sede'),
});

// Editar usuario: SOLO rol, sede y estado — los datos personales los
// administra el propio usuario desde su perfil (US12).
const editarUsuarioSchema = z.object({
  rol: z.enum(['superadmin', 'admin', 'cliente'], { message: 'Rol inválido' }),
  campusId: z.coerce.number().int().positive('Falta seleccionar la sede'),
  activo: z.boolean(),
});

const cambiarEstadoSchema = z.object({
  activo: z.boolean(),
});

// US9 — todo opcional: sin ningún query param, GET /api/users devuelve la
// lista completa, igual que antes.
const listarUsuariosQuerySchema = z.object({
  q: z.string().trim().optional(),
  rol: z.enum(['superadmin', 'admin', 'cliente'], { message: 'Rol inválido' }).optional(),
  campusId: z.coerce.number().int().positive('Sede inválida').optional(),
});

module.exports = {
  registrarUsuarioSchema,
  editarUsuarioSchema,
  cambiarEstadoSchema,
  listarUsuariosQuerySchema,
};
