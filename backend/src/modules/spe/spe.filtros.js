// Monserrat — US33 (filtros del dashboard SPE).
//
// Contrato: recibe req.query y devuelve los filtros ya validados que usa
// obtenerDashboardSpe (Liz). Los valores de departamento, sector y tamaño son
// exactamente los ENUM de spe_survey_response (s1_department, s1_export_sector,
// s1_company_size). Liz usa `sector` para US34.
//   parsearFiltrosSpe({ year: '2026', semester: '1', department: 'La Paz',
//                       sector: 'Textiles', size: 'Mediana' })
//     -> { year: 2026, semester: 1, department: 'La Paz', sector: 'Textiles', size: 'Mediana' }
// Lo que no venga o sea inválido, no se incluye (= sin filtro).
function parsearFiltrosSpe(query = {}) {
  return {};
}

module.exports = { parsearFiltrosSpe };
