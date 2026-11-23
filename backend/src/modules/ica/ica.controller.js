const { registroIcaSchema, entrevistaIcaSchema } = require('./ica.validation');
const icaService = require('./ica.service');
const { sedeDeGestion } = require('../../middlewares/sede.middleware');
// BOM UTF-8: sin él Excel abre el CSV como ANSI y muestra los acentos como caracteres basura.
const BOM_UTF8 = '\uFEFF';

// Gestión del ICA (US65): el Superadmin trabaja sobre cualquier sede
// (campusId null = todas, o la que pida con ?campusId=) y el Admin solo
// sobre la suya. `sinSede` = Admin sin sede asignada.
function sedeDeGestionIca(req) {
  const campusId = sedeDeGestion(req);
  return { campusId, sinSede: req.user.role !== 'superadmin' && !campusId };
}

// Lectura de dashboards (endpoints públicos): el visitante y el Superadmin
// eligen sede por query (sin campusId = todas); un usuario con rol de sede
// (Admin) queda fijo en la suya.
function resolverSedeLectura(req) {
  const rol = req.user?.role;
  if (!rol || rol === 'superadmin') {
    return { campusId: req.query.campusId ? Number(req.query.campusId) : null, mostrarTodasSedes: true };
  }
  return { campusId: req.user.campusId, mostrarTodasSedes: false };
}

async function getDashboardIca(req, res) {
  const { campusId, mostrarTodasSedes } = resolverSedeLectura(req);
  if (!mostrarTodasSedes && !campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const dashboard = await icaService.obtenerDashboard({
      campusId,
      mostrarTodasSedes,
      year: req.query.year ? Number(req.query.year) : null,
      quarter: req.query.quarter ? Number(req.query.quarter) : null,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
      dimension: req.query.dimension ? String(req.query.dimension) : null,
      genero: ['hombres', 'mujeres'].includes(req.query.gender) ? req.query.gender : null,
    });
    return res.status(200).json(dashboard);
  } catch (err) {
    console.error('Error al obtener dashboard ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el dashboard ICA' });
  }
}

async function getExploradorPreguntasIca(req, res) {
  const { campusId, mostrarTodasSedes } = resolverSedeLectura(req);
  if (!mostrarTodasSedes && !campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const resultado = await icaService.obtenerExploradorPreguntas({
      campusId,
      year: req.query.year ? Number(req.query.year) : null,
      quarter: req.query.quarter ? Number(req.query.quarter) : null,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
      dimension: req.query.dimension ? String(req.query.dimension) : null,
      genero: ['hombres', 'mujeres'].includes(req.query.gender) ? req.query.gender : null,
    });
    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al obtener explorador de preguntas ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el explorador de preguntas ICA' });
  }
}


async function postRegistroIca(req, res) {
  const parsed = registroIcaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const resultado = await icaService.registrarRegistroIndividual({
      ...parsed.data,
      userId: req.user.userId,
      campusId,
      rol: req.user.role,
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

async function postEntrevistaIca(req, res) {
  const parsed = entrevistaIcaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });
  if (req.user.role === 'encuestador' && !parsed.data.eventId) {
    return res.status(400).json({ error: 'Falta indicar el evento asignado' });
  }
  if (req.user.role !== 'encuestador' && (!parsed.data.year || !parsed.data.quarter)) {
    const fieldErrors = {};
    if (!parsed.data.year) fieldErrors.year = ['Falta el año'];
    if (!parsed.data.quarter) fieldErrors.quarter = ['Falta el trimestre'];
    return res.status(400).json({ error: 'Datos inválidos', detalles: { formErrors: [], fieldErrors } });
  }

  try {
    const resultado = await icaService.registrarEntrevistaIndividual({
      ...parsed.data,
      userId: req.user.userId,
      campusId,
      rol: req.user.role,
    });
    return res.status(201).json({ message: 'Entrevista ICA guardada correctamente', ...resultado });
  } catch (err) {
    if (err.message === 'COMUNIDAD_NO_ENCONTRADA') {
      return res.status(400).json({ error: 'La comuna no pertenece a tu sede o ya no está disponible' });
    }
    if (err.message === 'EVENTO_ICA_NO_ASIGNADO') {
      return res.status(400).json({ error: 'El evento no está asignado a este encuestador o no habilita encuestas ICA' });
    }
    console.error('Error al guardar entrevista ICA:', err);
    return res.status(500).json({ error: 'No se pudo guardar la entrevista ICA' });
  }
}

async function getComunidadesIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  try {
    const comunidades = await icaService.obtenerComunidadesPorSede(campusId);
    return res.status(200).json({
      comunidades: comunidades.map((c) => ({
        id: c.community_id,
        nombre: c.community_name,
        campusId: c.campus_id,
        sede: c.campus_name,
      })),
    });
  } catch (err) {
    console.error('Error al obtener comunidades ICA:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las comunas' });
  }
}




async function getHistorialIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

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

// Detalle de un registro individual (sus 32 respuestas y su puntaje).
async function getDetalleRegistroIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const dataLoadId = Number(req.params.id);
  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({ error: 'Id de registro inválido' });
  }

  try {
    const detalle = await icaService.obtenerDetalleRegistroIca({ campusId, dataLoadId });
    return res.status(200).json(detalle);
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el registro, o no pertenece a tu sede' });
    }
    console.error('Error al obtener detalle del registro ICA:', err);
    return res.status(500).json({ error: 'No se pudo cargar el detalle del registro' });
  }
}
async function deleteRegistroIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const dataLoadId = Number(req.params.id);
  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({ error: 'Id de registro inválido' });
  }

  try {
    await icaService.eliminarRegistroIndividual({ campusId, dataLoadId });
    return res.status(200).json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el registro, o no pertenece a tu sede' });
    }
    console.error('Error al eliminar registro individual ICA:', err);
    return res.status(500).json({ error: 'No se pudo eliminar el registro' });
  }
}

// Función para verificar una encuesta ICA (ya sea de carga masiva o manual) (cambio de estado a 2)
async function verifyCargaIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const dataLoadId = Number(req.params.id);

  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({
      error: 'Id inválido',
    });
  }

  try {
    await icaService.verificarCargaIca({
      campusId,
      dataLoadId,
    });

    return res.status(200).json({
      message: 'Registro verificado correctamente',
    });
  } catch (err) {
    if (err.message === 'ARCHIVO_NO_ENCONTRADO') {
      return res.status(404).json({
        error: 'No se encontró el registro, o no pertenece a tu sede',
      });
    }

    console.error('Error al verificar registro ICA:', err);

    return res.status(500).json({
      error: 'No se pudo verificar el registro',
    });
  }
}

async function downloadRegistroIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const dataLoadId = Number(req.params.id);
  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }

  const formato = String(req.query.formato || 'xlsx').toLowerCase();
  if (!['xlsx', 'json'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Usá "xlsx" o "json".' });
  }

  try {
    const { contenido, nombreArchivo, mimeType } = await icaService.generarDescargaRegistroIndividual({
      campusId,
      dataLoadId,
      formato,
    });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    return res.send(contenido);
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el registro, o no pertenece a tu sede' });
    }
    console.error('Error al generar descarga de registro individual ICA:', err);
    return res.status(500).json({ error: 'No se pudo generar la descarga del registro' });
  }
}

async function getExportRespuestasIca(req, res) {
  const { campusId, sinSede } = sedeDeGestionIca(req);
  if (sinSede) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const formato = String(req.query.formato || 'xlsx').toLowerCase();
  if (!['xlsx', 'csv', 'json'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Usá "xlsx", "csv" o "json".' });
  }

  try {
    const { contenido, nombreArchivo, mimeType } = await icaService.generarExportacionRespuestasIca({
      campusId,
      year: req.query.year ? Number(req.query.year) : null,
      quarter: req.query.quarter ? Number(req.query.quarter) : null,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
      formato,
    });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    return res.send(mimeType.startsWith('text/csv') ? BOM_UTF8 + contenido : contenido);
  } catch (err) {
    console.error('Error al exportar respuestas ICA:', err);
    return res.status(500).json({ error: 'No se pudo generar la exportación' });
  }
}
function escaparCsvExport(valor) {
  const texto = String(valor ?? '');
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

async function getExportIca(req, res) {
  const { campusId, mostrarTodasSedes } = resolverSedeLectura(req);
  if (!mostrarTodasSedes && !campusId) return res.status(400).json({ error: 'Tu usuario no tiene una sede asignada' });

  const formato = String(req.query.formato || 'json').toLowerCase();
  if (!['csv', 'json', 'xlsx'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Usá "xlsx", "csv" o "json".' });
  }

  try {
    const dataset = await icaService.obtenerDatasetIcaExport({
      campusId,
      year: req.query.year ? Number(req.query.year) : null,
      quarter: req.query.quarter ? Number(req.query.quarter) : null,
      communityId: req.query.communityId ? Number(req.query.communityId) : null,
      genero: ['hombres', 'mujeres'].includes(req.query.gender) ? req.query.gender : null,
    });

    if (formato === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="dataset_ica.json"');
      return res.send(JSON.stringify(dataset, null, 2));
    }

    if (formato === 'xlsx') {
      const { contenido, nombreArchivo, mimeType } = icaService.generarExcelDatasetIca(dataset);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      return res.send(contenido);
    }

    const columnas = ['comuna', 'year', 'quarter', 'conocimiento', 'uso', 'educacion', 'prevision', 'icaHombres', 'icaMujeres', 'icaGeneral'];
    const lineas = [columnas.join(';')];
    for (const fila of dataset) {
      lineas.push(columnas.map((col) => escaparCsvExport(fila[col])).join(';'));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dataset_ica.csv"');
    return res.send(BOM_UTF8 + lineas.join('\n'));
  } catch (err) {
    console.error('Error al exportar dataset ICA:', err);
    return res.status(500).json({ error: 'No se pudo generar la exportación' });
  }
}
module.exports = {
  getDashboardIca,
  getExploradorPreguntasIca,
  getComunidadesIca,
  postRegistroIca,
  postEntrevistaIca,
  getHistorialIca,
  getDetalleRegistroIca,
  deleteRegistroIca,
  verifyCargaIca,
  downloadRegistroIca,
  getExportIca,
  getExportRespuestasIca,
};