const { z } = require('zod');
const { FORMATO_TEMPORAL_REGEX } = require('../../config/passwordTemporal');

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});

const verifyCodeSchema = z.object({
  email: z.string().email('Correo inválido'),
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Falta la contraseña actual'),
  newPassword: passwordSchema,
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  passwordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
