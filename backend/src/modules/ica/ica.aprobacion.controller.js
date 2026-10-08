// Monserrat — US58 (bandeja de pendientes) y US59 (aprobar/rechazar).
// - Bandeja: cargas ICA con data_load.status = ESTADO_CARGA.PENDIENTE.
//   Admin ve solo su sede y Superadmin todas: sedeDeGestion(req) de
//   middlewares/sede.middleware.js.
// - Aprobar: status = ESTADO_CARGA.APROBADA y después
//   `await recalcularAgregadoIca(...)` (Liz, ica.scoring.service.js — US60).
// - Rechazar: status = ESTADO_CARGA.RECHAZADA (falta columna para el motivo,
//   ver docs/SPRINT2.md).
// - US59 también pide que dashboard, explorador y export cuenten solo
//   cargas APROBADAS (hoy no filtran por estado).
// Crea tu ica.aprobacion.service.js al implementar.
const { sedeDeGestion } = require('../../middlewares/sede.middleware');
const { obtenerPendientesIca, cambiarEstadoCargaIca } = require('./ica.aprobacion.service');
const {
  cambioEstadoSpeSchema: cambioEstadoIcaSchema,
  idCargaSchema,
} = require('../spe/spe.aprobacion.validation');

// Admin -> su sede; Superadmin -> null (todas). Ajustalo a lo que devuelva tu middleware.
function resolverCampus(req) {
  const sede = sedeDeGestion(req);
  const campusId = typeof sede === 'object' && sede !== null ? sede.campusId : sede;
  return campusId ? Number(campusId) : null;
}

async function getPendientesIca(req, res) {
  const campusId = resolverCampus(req);
  if (req.user.role !== 'superadmin' && !campusId) {
    return res.status(400).json({ message: 'Tu usuario no tiene una sede asignada' });
  }

  try {
    const datos = await obtenerPendientesIca({ campusId });
    return res.json(datos);
  } catch (err) {
    console.error('Error al obtener pendientes ICA:', err);
    return res.status(500).json({ message: 'No se pudieron obtener las encuestas pendientes' });
  }
}

async function patchEstadoCargaIca(req, res) {
  const id = idCargaSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ message: 'Id de carga inválido' });

  const cuerpo = cambioEstadoIcaSchema.safeParse(req.body);
  if (!cuerpo.success) {
    return res
      .status(400)
      .json({ message: 'Datos inválidos', errores: cuerpo.error.flatten().fieldErrors });
  }

  const campusId = resolverCampus(req);
  if (req.user.role !== 'superadmin' && !campusId) {
    return res.status(400).json({ message: 'Tu usuario no tiene una sede asignada' });
  }

  try {
    const resultado = await cambiarEstadoCargaIca({
      dataLoadId: id.data,
      estado: cuerpo.data.estado,
      motivo: cuerpo.data.motivo,
      revisorId: req.user.userId ?? req.user.id,
      campusId,
    });
    return res.json({
      message: resultado.estado === 'aprobada' ? 'Carga aprobada' : 'Carga rechazada',
      ...resultado,
    });
  } catch (err) {
    if (err.message === 'CARGA_NO_ENCONTRADA') return res.status(404).json({ message: 'Carga ICA no encontrada' });
    if (err.message === 'CARGA_YA_REVISADA') return res.status(409).json({ message: 'La carga ya fue revisada' });
    console.error('Error al cambiar estado de carga ICA:', err);
    return res.status(500).json({ message: 'No se pudo actualizar el estado de la carga' });
  }
}

module.exports = { getPendientesIca, patchEstadoCargaIca };
