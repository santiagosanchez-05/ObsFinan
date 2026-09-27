// Liz — US35 (dashboard) y US34 (filtro de rubro).
//
// GET /api/spe arma la respuesta con piezas de tres personas, cada una en su
// archivo (así nadie pisa a nadie):
//   const filtros = parsearFiltrosSpe(req.query);          // Monserrat — spe.filtros.js (US33)
//   const datos = await obtenerDashboardSpe(filtros);       // Liz — spe.dashboard.service.js
//   const insights = calcularInsightsSpe(datos);            // Kevin Alanes — spe.insights.service.js (US36)
//   res.json({ ...datos, insights });
//
// Mientras no esté implementado, responde 501.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getDashboardSpe: pendiente('US35', 'Liz'),
};
