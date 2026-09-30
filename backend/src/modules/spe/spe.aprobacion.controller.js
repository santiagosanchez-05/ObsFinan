// Monserrat — US62 (bandeja y aprobación de encuestas SPE, solo Superadmin).
// Al aprobar: data_load.status = ESTADO_CARGA.APROBADA y después
// `await calcularIndicesSpe(dataLoadId)` (Liz, spe.indices.service.js).
// Al rechazar: ESTADO_CARGA.RECHAZADA (ver docs/SPRINT2.md: falta columna para el motivo).
// Monserrat — US62 (bandeja y aprobación de encuestas SPE, solo Superadmin).
const { obtenerPendientesSpe, cambiarEstadoCargaSpe } = require('./spe.aprobacion.service');
const { cambioEstadoSpeSchema, idCargaSchema } = require('./spe.aprobacion.validation');

async function getPendientesSpe(req, res) {
  try {
    const datos = await obtenerPendientesSpe();
    return res.json(datos);
  } catch (err) {
    console.error('Error al obtener pendientes SPE:', err);
    return res.status(500).json({ message: 'No se pudieron obtener las encuestas pendientes' });
  }
}

async function patchEstadoCargaSpe(req, res) {
  const id = idCargaSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ message: 'Id de carga inválido' });

  const cuerpo = cambioEstadoSpeSchema.safeParse(req.body);
  if (!cuerpo.success) {
    return res.status(400).json({ message: 'Datos inválidos', errores: cuerpo.error.flatten().fieldErrors });
  }

  try {
    const resultado = await cambiarEstadoCargaSpe({
      dataLoadId: id.data,
      estado: cuerpo.data.estado,
      motivo: cuerpo.data.motivo,
      revisorId: req.user.userId ?? req.user.id,
    });
    return res.json({
      message: resultado.estado === 'aprobada' ? 'Carga aprobada' : 'Carga rechazada',
      ...resultado,
    });
  } catch (err) {
    if (err.message === 'CARGA_NO_ENCONTRADA') return res.status(404).json({ message: 'Carga SPE no encontrada' });
    if (err.message === 'CARGA_YA_REVISADA') return res.status(409).json({ message: 'La carga ya fue revisada' });
    console.error('Error al cambiar estado de carga SPE:', err);
    return res.status(500).json({ message: 'No se pudo actualizar el estado de la carga' });
  }
}

module.exports = { getPendientesSpe, patchEstadoCargaSpe };