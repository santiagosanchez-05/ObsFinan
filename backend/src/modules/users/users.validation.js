const { z } = require('zod');
const { campoNombre, campoNombreOpcional, campoCorreo } = require('../../utils/validacionesComunes');

const registrarUsuarioSchema = z.object({
  nombre: campoNombre('El nombre'),
  apellidoPaterno: campoNombre('El apellido paterno'),
  apellidoMaterno: campoNombreOpcional('El apellido materno'),
  correo: campoCorreo(),
  rol: z.enum(['superadmin', 'admin', 'encuestador'], { message: 'Rol inválido' }),
  campusId: z.coerce.number().int().positive('Falta seleccionar la sede'),
});

// Editar usuario: SOLO rol, sede y estado — los datos personales los
// administra el propio usuario desde su perfil (US12).
const editarUsuarioSchema = z.object({
  rol: z.enum(['superadmin', 'admin', 'encuestador'], { message: 'Rol inválido' }),
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
  rol: z.enum(['superadmin', 'admin', 'encuestador'], { message: 'Rol inválido' }).optional(),
  campusId: z.coerce.number().int().positive('Sede inválida').optional(),
  // US8 — paginado
  page: z.coerce.number().int().positive('Página inválida').optional(),
  pageSize: z.coerce.number().int().min(1).max(100, 'Máximo 100 por página').optional(),
});

module.exports = {
  registrarUsuarioSchema,
  editarUsuarioSchema,
  cambiarEstadoSchema,
  listarUsuariosQuerySchema,
};
