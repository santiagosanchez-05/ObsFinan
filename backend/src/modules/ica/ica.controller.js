const { uploadIcaMetaSchema, registroIcaSchema } = require('./ica.validation');
const icaService = require('./ica.service');

async function getDashboardIca(req, res) {
  const campusId = req.user.campusId;
  if (!campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const dashboard = await icaService.obtenerDashboard({
      campusId,
      year: req.query.year ? Number(req.query.year) : null,
      quarter: req.query.quarter ? Number(req.query.quarter) : null,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
    });
    return res.status(200).json(dashboard);
  } catch (err) {
    console.error('Error al obtener dashboard ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el dashboard ICA' });
  }
}


async function postRegistroIca(req, res) {
  const parsed = registroIcaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  if (!req.user.campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const resultado = await icaService.registrarRegistroIndividual({
      ...parsed.data,
      userId: req.user.userId,
      campusId: req.user.campusId,
    });
    return res.status(201).json({ message: 'Registro ICA guardado correctamente', ...resultado });
  } catch (err) {
    if (err.message === 'COMUNIDAD_NO_ENCONTRADA') {
      return res.status(400).json({ error: 'La comuna no pertenece a tu sede o ya no está disponible' });
    }
    console.error('Error al registrar ICA:', err);
    return res.status(500).json({ error: 'No se pudo guardar el registro ICA' });
  }
}

async function getComunidadesIca(req, res) {
  const campusId = req.user.campusId;
  if (!campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const comunidades = await icaService.obtenerComunidadesPorSede(campusId);
    return res.status(200).json({
      comunidades: comunidades.map((c) => ({ id: c.community_id, nombre: c.community_name })),
    });
  } catch (err) {
    console.error('Error al obtener comunidades ICA:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las comunas' });
  }
}



async function postUploadIca(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });
  }

  // Ahora incluye communityId: el archivo entero es de UNA sola comuna,
  // elegida en el formulario, ya no viene por columna en el Excel.
  const parsedMeta = uploadIcaMetaSchema.safeParse(req.body);
  if (!parsedMeta.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsedMeta.error.flatten(), tipo: 'formato_invalido' });
  }
  const { communityId, quarter, year } = parsedMeta.data;

  const campusId = req.user.campusId;
  if (!campusId) {
    return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });
  }

  let datos;
  try {
    datos = icaService.parsearArchivoIca(req.file.buffer);
  } catch (err) {
    if (err.message === 'ENCABEZADOS_INVALIDOS') {
      return res.status(400).json({ error: 'El archivo no tiene las columnas esperadas (las 32 preguntas del instrumento)', detalle: err.detalle, tipo: 'formato_invalido' });
    }
    if (err.message === 'ARCHIVO_SIN_FILAS') {
      return res.status(400).json({ error: 'El archivo no tiene filas de datos', tipo: 'formato_invalido' });
    }
    console.error('Error al parsear archivo ICA:', err);
    return res.status(400).json({ error: 'No se pudo leer el archivo. ¿Es un Excel válido?', tipo: 'formato_invalido' });
  }

  const { filasValidas, errores } = icaService.validarFilas(datos);

  if (filasValidas.length === 0) {
    return res.status(400).json({ error: 'Ninguna fila es válida', errores, tipo: 'formato_invalido' });
  }

  try {
    const resultado = await icaService.registrarCargaPorArchivo({
      filasValidas,
      communityId,
      campusId,
      quarter,
      year,
      userId: req.user.userId,
      nombreArchivo: req.file.originalname,
      buffer: req.file.buffer,
    });

    return res.status(201).json({
      message: 'Archivo cargado correctamente',
      dataLoadId: resultado.dataLoadId,
      filasInsertadas: resultado.totalInsertados,
      filasConError: errores,
    });
  } catch (err) {
    if (err.message === 'COMUNIDAD_NO_ENCONTRADA') {
      return res.status(400).json({ error: 'La comuna seleccionada no pertenece a tu sede' });
    }
    if (err.message === 'ARCHIVO_NO_GUARDADO') {
      return res.status(500).json({ error: 'No se pudo guardar el archivo en el servidor. Intentá de nuevo.' });
    }
    console.error('Error al registrar carga ICA:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
//Descarga de excel (subida masiva)
async function downloadArchivoIca(req, res) {
  const campusId = req.user.campusId;

  if (!campusId) {
    return res.status(400).json({
      error: 'Tu usuario no tiene una sede asignada',
    });
  }

  const dataLoadId = Number(req.params.id);

  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({
      error: 'Id inválido',
    });
  }

  try {
    const resultado = await icaService.obtenerArchivoParaDescarga({
      campusId,
      dataLoadId,
    });

    return res.download(
      resultado.ruta,
      resultado.nombreArchivo
    );
  } catch (err) {
    if (err.message === 'ARCHIVO_NO_ENCONTRADO') {
      return res.status(404).json({
        error: 'No se encontró el archivo',
      });
    }

    if (err.message === 'ARCHIVO_NO_DISPONIBLE') {
      return res.status(404).json({
        error: 'El archivo ya no está disponible en el servidor',
      });
    }

    console.error('Error al descargar archivo ICA:', err);

    return res.status(500).json({
      error: 'No se pudo descargar el archivo',
    });
  }
}

async function getHistorialIca(req, res) {
  const campusId = req.user.campusId;
  if (!campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const resultado = await icaService.obtenerHistorialIca({
      campusId,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
      tipo: req.query.tipo,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
      busqueda: req.query.busqueda ? String(req.query.busqueda).trim() : '',
      estado: req.query.estado,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
    });

    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener historial ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el historial ICA' });
  }
}

async function getDetalleArchivoIca(req, res) {
  const campusId = req.user.campusId;
  if (!campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const dataLoadId = Number(req.params.id);
  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({ error: 'Id de archivo inválido' });
  }

  try {
    const detalle = await icaService.obtenerDetalleArchivoIca({ campusId, dataLoadId });
    return res.status(200).json(detalle);
  } catch (err) {
    if (err.message === 'ARCHIVO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el archivo, o no pertenece a tu sede' });
    }
    console.error('Error al obtener detalle de archivo ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el detalle del archivo' });
  }
}
async function deleteRegistroIca(req, res) {
  const campusId = req.user.campusId;

  if (!campusId) {
    return res.status(400).json({
      error: 'Tu usuario no tiene una sede asignada',
    });
  }

  const surveyResponseId = Number(req.params.id);

  if (!Number.isInteger(surveyResponseId) || surveyResponseId <= 0) {
    return res.status(400).json({
      error: 'Id de registro inválido',
    });
  }

  try {
    await icaService.eliminarRegistroIndividual({
      campusId,
      surveyResponseId,
    });

    return res.status(200).json({
      message: 'Registro eliminado correctamente',
    });
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({
        error: 'No se encontró el registro, o no pertenece a tu sede',
      });
    }

    console.error('Error al eliminar registro individual ICA:', err);

    return res.status(500).json({
      error: 'No se pudo eliminar el registro',
    });
  }
}

async function deleteArchivoIca(req, res) {
  const campusId = req.user.campusId;

  if (!campusId) {
    return res.status(400).json({
      error: 'Tu usuario no tiene una sede asignada',
    });
  }

  const dataLoadId = Number(req.params.id);

  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({
      error: 'Id inválido',
    });
  }

  try {
    await icaService.eliminarArchivoIca({
      campusId,
      dataLoadId,
    });

    return res.status(200).json({
      message: 'Archivo eliminado correctamente',
    });
  } catch (err) {
    if (err.message === 'ARCHIVO_NO_ENCONTRADO') {
      return res.status(404).json({
        error: 'No se encontró el archivo, o no pertenece a tu sede',
      });
    }

    console.error('Error al eliminar archivo ICA:', err);

    return res.status(500).json({
      error: 'No se pudo eliminar el archivo',
    });
  }
}
async function deleteRespuestaIca(req, res) {
  const campusId = req.user.campusId;

  if (!campusId) {
    return res.status(400).json({
      error: 'Tu usuario no tiene una sede asignada',
    });
  }

  const surveyResponseId = Number(req.params.id);

  if (!Number.isInteger(surveyResponseId) || surveyResponseId <= 0) {
    return res.status(400).json({
      error: 'Id de entrevista inválido',
    });
  }

  try {
    await icaService.eliminarRespuestaIca({
      campusId,
      surveyResponseId,
    });

    return res.status(200).json({
      message: 'Entrevista eliminada correctamente',
    });
  } catch (err) {
    if (err.message === 'RESPUESTA_NO_ENCONTRADA') {
      return res.status(404).json({
        error: 'No se encontró la entrevista, o no pertenece a tu sede',
      });
    }

    console.error('Error al eliminar entrevista ICA:', err);

    return res.status(500).json({
      error: 'No se pudo eliminar la entrevista',
    });
  }
}
// Función para verificar un archivo ICA (cambio de estado a 2)
async function verifyArchivoIca(req, res) {
  const campusId = req.user.campusId;

  if (!campusId) {
    return res.status(400).json({
      error: 'Tu usuario no tiene una sede asignada',
    });
  }

  const dataLoadId = Number(req.params.id);

  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({
      error: 'Id inválido',
    });
  }

  try {
    await icaService.verificarArchivoIca({
      campusId,
      dataLoadId,
    });

    return res.status(200).json({
      message: 'Archivo verificado correctamente',
    });
  } catch (err) {
    if (err.message === 'ARCHIVO_NO_ENCONTRADO') {
      return res.status(404).json({
        error: 'No se encontró el archivo, o no pertenece a tu sede',
      });
    }

    console.error('Error al verificar archivo ICA:', err);

    return res.status(500).json({
      error: 'No se pudo verificar el archivo',
    });
  }
}
module.exports = { getDashboardIca, getComunidadesIca, postRegistroIca, postUploadIca, getHistorialIca, getDetalleArchivoIca, deleteRegistroIca, deleteArchivoIca, deleteRespuestaIca,verifyArchivoIca, downloadArchivoIca };