const usersService = require('./users.service');
const {
  registrarUsuarioSchema,
  editarUsuarioSchema,
  cambiarEstadoSchema,
  listarUsuariosQuerySchema,
} = require('./users.validation');

async function getUsuarios(req, res) {
  const parsed = listarUsuariosQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Filtros inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const data = await usersService.obtenerDashboardUsuarios(parsed.data);
    return res.json(data);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getUsuarioPorId(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const usuario = await usersService.obtenerUsuarioPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json(usuario);
  } catch (err) {
    console.error('Error al obtener el detalle del usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getFotoUsuario(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const foto = await usersService.obtenerFotoUsuario(userId);
    if (!foto) {
      return res.status(404).json({ error: 'Este usuario no tiene foto' });
    }
    res.set('Content-Type', foto.mimeType);
    res.set('Cache-Control', 'private, max-age=3600');
    return res.send(foto.buffer);
  } catch (err) {
    console.error('Error al obtener la foto del usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function getCampuses(req, res) {
  try {
    const campuses = await usersService.obtenerCampusActivos();
    return res.json(campuses);
  } catch (err) {
    console.error('Error al obtener sedes:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postRegistrarUsuario(req, res) {
  const parsed = registrarUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const resultado = await usersService.registrarUsuario({
      ...parsed.data,
      creadoPor: req.user.userId,
      foto: req.file?.buffer,
    });

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      userId: resultado.userId,
      passwordTemporal: resultado.passwordTemporal,
      correoEnviado: resultado.correoEnviado,
    });
  } catch (err) {
    if (err.message === 'CORREO_YA_REGISTRADO') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    }
    if (err.message === 'SEDE_YA_TIENE_ADMIN') {
      return res.status(409).json({ error: 'Esta sede ya tiene un administrador activo' });
    }
    if (err.message === 'ROL_INVALIDO') {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    console.error('Error al registrar usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function patchEditarUsuario(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const parsed = editarUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const usuario = await usersService.editarUsuario(userId, parsed.data, req.user.userId);
    return res.json({ message: 'Usuario actualizado correctamente', usuario });
  } catch (err) {
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (err.message === 'ROL_INVALIDO') {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (err.message === 'SEDE_YA_TIENE_ADMIN') {
      return res.status(409).json({ error: 'Esta sede ya tiene un administrador activo' });
    }
    console.error('Error al editar usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function patchEstadoUsuario(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const parsed = cambiarEstadoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const usuario = await usersService.cambiarEstadoUsuario(userId, parsed.data.activo, req.user.userId);
    return res.json({ message: 'Estado actualizado correctamente', usuario });
  } catch (err) {
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (err.message === 'NO_PUEDES_DESACTIVARTE') {
      return res.status(400).json({ error: 'No podés dar de baja tu propia cuenta' });
    }
    console.error('Error al cambiar el estado del usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function postResetPasswordUsuario(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const resultado = await usersService.resetearPasswordUsuario(userId);
    return res.json({
      message: 'Contraseña restablecida correctamente',
      passwordTemporal: resultado.passwordTemporal,
      correoEnviado: resultado.correoEnviado,
    });
  } catch (err) {
    if (err.message === 'USUARIO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    console.error('Error al resetear la contraseña:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  getUsuarios,
  getUsuarioPorId,
  getFotoUsuario,
  getCampuses,
  postRegistrarUsuario,
  patchEditarUsuario,
  patchEstadoUsuario,
  postResetPasswordUsuario,
};
