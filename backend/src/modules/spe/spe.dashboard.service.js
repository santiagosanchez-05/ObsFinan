// Liz — US35.
//
// Contrato (lo usan el controlador del dashboard y los insights de Kevin Alanes):
//   obtenerDashboardSpe(filtros) -> {
//     periodo: { year, semester } | null,
//     totalEmpresas: number,
//     propensionInvertir: number,        // % de empresas con plans_to_invest = 1
//     expectativas: { pib: [...], inflacion: [...], tipoCambio: [...] },  // conteo por opción del ENUM
//     barreras: [{ barrera, porcentaje }],  // logistics, sanitary, competitiveness, financing, bureaucracy, certification
//     indices: {...},                     // lo completa US63 (spe.indices.service.js)
//     opcionesFiltros: {...},
//   }
// Solo cuentan cargas aprobadas: data_load.status = ESTADO_CARGA.APROBADA (config/estados.js).
async function obtenerDashboardSpe(filtros) {
  throw new Error('PENDIENTE: US35 (Liz)');
}

module.exports = { obtenerDashboardSpe };
