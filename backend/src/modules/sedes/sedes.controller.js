const { obtenerEstadisticas } = require("./sedes.service");

async function getStats(req, res) {
  try {
    const estadisticas = await obtenerEstadisticas();

    return res.status(200).json(estadisticas);
  } catch (error) {
    console.error("Error obteniendo estadísticas de sedes:", error);

    return res.status(500).json({
      error: "No se pudieron obtener las estadísticas de las sedes",
    });
  }
}

module.exports = {
  getStats,
};
