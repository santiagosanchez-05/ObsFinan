// Kevin Prieto — US51 (listado de convocatorias abiertas y cerradas).
// Abierta/cerrada se calcula con start_date/end_date contra la fecha de hoy.
// Admin ve solo su sede y Superadmin todas: sedeDeGestion(req) de middlewares/sede.middleware.js.
const { sedeDeGestion } = require('../../middlewares/sede.middleware');
const listadoService = require('./convocatorias.listado.service');

async function getConvocatorias(req, res) {
  try {
    const campusId = sedeDeGestion(req);
    const estado = req.query.estado ? String(req.query.estado).toLowerCase() : null;
    const busqueda = req.query.busqueda ? String(req.query.busqueda).trim() : null;

    const convocatorias = await listadoService.obtenerListadoConvocatorias({
      campusId,
      estado,
      busqueda,
    });

    return res.status(200).json(convocatorias);
  } catch (err) {
    console.error('Error al obtener convocatorias:', err);
    return res.status(500).json({ error: 'No se pudo obtener el listado de convocatorias' });
  }
}

module.exports = {
  getConvocatorias,
};
