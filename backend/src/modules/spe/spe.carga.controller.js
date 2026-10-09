// Monserrat — US39 (historial). La carga por dataset se quitó: todos los
// registros SPE son individuales.
const { historialSpeQuerySchema } = require('./spe.carga.validation');
const { obtenerHistorialSpe, obtenerResumenHistorialSpe } = require('./spe.carga.service');

async function getHistorialSpe(req, res) {
  const parsed = historialSpeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Parámetros inválidos',
      errores: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [historial, extra] = await Promise.all([
      obtenerHistorialSpe(parsed.data),
      obtenerResumenHistorialSpe(),
    ]);
    return res.json({ ok: true, data: { ...historial, ...extra } });
  } catch (err) {
    console.error('Error en getHistorialSpe:', err);
    return res.status(500).json({ ok: false, message: 'No se pudo obtener el historial SPE' });
  }
}

module.exports = {
  getHistorialSpe,
};