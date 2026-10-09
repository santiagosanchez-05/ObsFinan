// Kevin Prieto — US40 (descarga CSV/JSON), US41 (detalle de un registro), US42 (baja).
// La carga por archivo/dataset se quitó: todos los registros son individuales.
// La descarga es pública y solo incluye cargas APROBADAS.
const speArchivosService = require('./spe.archivos.service');

async function getExportSpe(req, res) {
  const formato = String(req.query.formato || 'json').toLowerCase();
  if (!['csv', 'json'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Usa "csv" o "json".' });
  }

  try {
    const dataset = await speArchivosService.exportarDatasetSpe({
      year: req.query.year ? Number(req.query.year) : null,
      semester: req.query.semester ? Number(req.query.semester) : null,
      department: req.query.department ? String(req.query.department).trim() : null,
      sector: req.query.sector ? String(req.query.sector).trim() : null,
      size: req.query.size ? String(req.query.size).trim() : null,
    });

    if (formato === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="dataset_spe.json"');
      return res.send(JSON.stringify(dataset, null, 2));
    }

    const csvData = speArchivosService.generarCsv(dataset);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dataset_spe.csv"');
    return res.send(csvData);
  } catch (err) {
    console.error('Error al exportar dataset SPE:', err);
    return res.status(500).json({ error: 'No se pudo generar la exportación SPE' });
  }
}

async function getDetalleRegistroSpe(req, res) {
  const dataLoadId = Number(req.params.id);
  if (!Number.isInteger(dataLoadId) || dataLoadId <= 0) {
    return res.status(400).json({ error: 'Id de registro inválido' });
  }

  try {
    const detalle = await speArchivosService.obtenerDetalleRegistroSpe(dataLoadId);
    return res.status(200).json(detalle);
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el registro especificado' });
    }
    console.error('Error al obtener detalle del registro SPE:', err);
    return res.status(500).json({ error: 'No se pudo cargar el detalle del registro SPE' });
  }
}

async function deleteRegistroSpe(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de registro inválido' });
  }

  try {
    await speArchivosService.eliminarRegistroIndividualSpe(id);
    return res.status(200).json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    if (err.message === 'REGISTRO_NO_ENCONTRADO') {
      return res.status(404).json({ error: 'No se encontró el registro a eliminar' });
    }
    console.error('Error al eliminar registro SPE:', err);
    return res.status(500).json({ error: 'No se pudo eliminar el registro SPE' });
  }
}

module.exports = {
  getExportSpe,
  getDetalleRegistroSpe,
  deleteRegistroSpe,
};
