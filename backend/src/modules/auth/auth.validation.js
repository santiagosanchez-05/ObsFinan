const { z } = require('zod');
const { campoNombre, campoNombreOpcional } = require('../../utils/validacionesComunes');
const { FORMATO_TEMPORAL_REGEX } = require('../../config/passwordTemporal');

const loginSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
});

const verifyCodeSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
});

// Reglas de contraseña compartidas — se van a reusar también en "Cambio de
// contraseña primer ingreso" y "Editar mi perfil" más adelante.
const passwordSchema = z
  .string()
  .min(8, 'Debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe tener al menos un número')
  .refine((val) => !FORMATO_TEMPORAL_REGEX.test(val), {
    message: 'No puede tener el formato de una contraseña temporal (UVL-XXXXXX)',
  });

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Falta el token de recuperación'),
  newPassword: passwordSchema,
});

const primerPasswordSchema = z.object({
  newPassword: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Falta la contraseña actual'),
  newPassword: passwordSchema,
});

const updateProfileSchema = z
  .object({
    first_name: campoNombre('El nombre').optional(),
    paternal_last_name: campoNombre('El apellido paterno').optional(),
    maternal_last_name: campoNombreOpcional('El apellido materno'),
    nombres: campoNombre('El nombre').optional(),
    apellidoPaterno: campoNombre('El apellido paterno').optional(),
    apellidoMaterno: campoNombreOpcional('El apellido materno'),
  })
  .refine((data) => (data.first_name || data.nombres) && (data.paternal_last_name || data.apellidoPaterno), {
    message: 'El nombre y apellido paterno son obligatorios',
  });

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  passwordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  primerPasswordSchema,
  updateProfileSchema,
};

