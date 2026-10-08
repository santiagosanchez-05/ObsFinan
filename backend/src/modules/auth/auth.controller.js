const {
  loginSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  resetPasswordSchema,
  changePasswordSchema,
  primerPasswordSchema,
  updateProfileSchema,
} = require('./auth.validation');
const authService = require('./auth.service');


async function postLogin(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  try {
    const resultado = await authService.login(email, password);
    return res.json(resultado);
  } catch (err) {
    if (err.message === 'CREDENCIALES_INVALIDAS') {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postForgotPassword(req, res) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    await authService.solicitarCodigoRecuperacion(parsed.data.email);
  } catch (err) {
    console.error('Error al enviar código de recuperación:', err);
    // Igual devolvemos el mensaje genérico — no hay que exponer detalles internos.
  }

  // Misma respuesta exista o no el correo, y haya fallado el envío o no.
  return res.json({ message: 'Si el correo existe, te enviamos un código de recuperación.' });
}

async function postVerifyCode(req, res) {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { email, code } = parsed.data;

  try {
    const resultado = await authService.verificarCodigo(email, code);
    return res.json(resultado);
  } catch (err) {
    if (err.message === 'CODIGO_EXPIRADO') {
      return res.status(400).json({ error: 'El código expiró. Solicitá uno nuevo.' });
    }
    if (err.message === 'CODIGO_INVALIDO') {
      return res.status(400).json({ error: 'Código inválido' });
    }
    console.error('Error al verificar código:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postResetPassword(req, res) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { resetToken, newPassword } = parsed.data;

  try {
    await authService.restablecerContrasena(resetToken, newPassword);
    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    if (err.message === 'TOKEN_INVALIDO') {
      return res.status(401).json({ error: 'El enlace expiró o no es válido. Solicitá un nuevo código.' });
    }
    console.error('Error al restablecer contraseña:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postChangePassword(req, res) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    await authService.cambiarPasswordPropia(req.user.userId, currentPassword, newPassword);
    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    if (err.message === 'CONTRASENA_ACTUAL_INCORRECTA') {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    console.error('Error al cambiar contraseña:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Primer ingreso con la contraseña temporal: solo pide la nueva.
async function postFirstPassword(req, res) {
  if (!req.user.debeCambiarPassword) {
    return res.status(403).json({ error: 'Esta acción solo está disponible en el primer ingreso' });
  }
  const parsed = primerPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const token = await authService.establecerPasswordInicial(req.user, parsed.data.newPassword);
    return res.json({ message: 'Contraseña actualizada correctamente', token });
  } catch (err) {
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    console.error('Error al establecer la contraseña inicial:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function putUpdateProfile(req, res) {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const updatedUser = await authService.actualizarPerfil(userId, parsed.data);
    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      user: updatedUser,
    });
  } catch (err) {
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    console.error('Error al actualizar perfil:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  postLogin,
  postForgotPassword,
  postVerifyCode,
  postResetPassword,
  postChangePassword,
  postFirstPassword,
  putUpdateProfile,
};

