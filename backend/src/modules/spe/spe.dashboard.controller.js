// Liz — US35 (dashboard) y US34 (filtro por sector exportador).
//
// GET /api/spe arma la respuesta con piezas de tres personas, cada una en su
// archivo (así nadie pisa a nadie):
//   const filtros = parsearFiltrosSpe(req.query);          // Monserrat — spe.filtros.js (US33)
//   const datos = await obtenerDashboardSpe(filtros);       // Liz — spe.dashboard.service.js
//   const insights = calcularInsightsSpe(datos);            // Kevin Alanes — spe.insights.service.js (US36)
//   res.json({ ...datos, insights });
//
const { parsearFiltrosSpe } = require('./spe.filtros');
const { obtenerDashboardSpe } = require('./spe.dashboard.service');
const { calcularInsightsSpe } = require('./spe.insights.service');

module.exports = {
  async getDashboardSpe(req, res) {
    try {
      const filtros = parsearFiltrosSpe(req.query);
      const datos = await obtenerDashboardSpe(filtros);
      return res.json({ ...datos, insights: calcularInsightsSpe(datos) });
    } catch (error) {
      console.error('Error al cargar dashboard SPE:', error);
      return res.status(500).json({ error: 'No se pudo cargar el dashboard SPE' });
    }
  },
};
