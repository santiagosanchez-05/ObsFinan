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
  if (!campusId) {
    return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });
  }

  try {
    const comunidades = await icaService.obtenerComunidadesPorSede(campusId);
    return res.status(200).json({ comunidades: comunidades.map((comunidad) => ({
      id: comunidad.community_id,
      nombre: comunidad.community_name,
    })) });
  } catch (err) {
    console.error('Error al obtener comunidades ICA:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las comunas' });
  }
}

async function getHistorialIca(req, res) {
  const campusId = req.user.campusId;
  if (!campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const registros = await icaService.obtenerHistorial({ campusId });
    return res.status(200).json({ registros });
  } catch (err) {
    console.error('Error al obtener historial ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el historial ICA' });
  }
}

async function postUploadIca(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el archivo (campo "archivo")' });
  }

  const parsedMeta = uploadIcaMetaSchema.safeParse(req.body);
  if (!parsedMeta.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsedMeta.error.flatten() });
  }
  const { quarter, year } = parsedMeta.data;

  const campusId = req.user.campusId;
  if (!campusId) {
    return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });
  }

  let datos;
  try {
    datos = icaService.parsearArchivoIca(req.file.buffer);
  } catch (err) {
    if (err.message === 'ENCABEZADOS_INVALIDOS') {
      return res.status(400).json({ error: 'El archivo no tiene las columnas esperadas', detalle: err.detalle });
    }
    if (err.message === 'ARCHIVO_SIN_FILAS') {
      return res.status(400).json({ error: 'El archivo no tiene filas de datos' });
    }
    console.error('Error al parsear archivo ICA:', err);
    return res.status(400).json({ error: 'No se pudo leer el archivo. ¿Es un Excel válido?' });
  }

  const { filasValidas, errores } = icaService.validarFilas(datos);

  if (filasValidas.length === 0) {
    return res.status(400).json({ error: 'Ninguna fila es válida', errores });
  }

  try {
    const resultado = await icaService.registrarCargaPorArchivo({
      filasValidas,
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
      comunasNoEncontradas: resultado.noEncontradas,
    });
  } catch (err) {
    if (err.message === 'COMUNIDADES_NO_ENCONTRADAS') {
      return res.status(400).json({ error: 'Ninguna comuna del archivo coincide con las de tu sede', comunas: err.detalle });
    }
    if (err.message === 'ARCHIVO_NO_GUARDADO') {
      return res.status(500).json({ error: 'No se pudo guardar el archivo en el servidor. Intentá de nuevo.' });
    }
    console.error('Error al registrar carga ICA:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { getDashboardIca, getComunidadesIca, getHistorialIca, postRegistroIca, postUploadIca };