const { z } = require('zod');

const registrarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().trim().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().trim().optional().or(z.literal('')),
  correo: z.string().trim().email('Correo inválido'),
  rol: z.enum(['superadmin', 'admin', 'cliente'], { message: 'Rol inválido' }),
  campusId: z.coerce.number().int().positive('Falta seleccionar la sede'),
});

module.exports = { registrarUsuarioSchema };
