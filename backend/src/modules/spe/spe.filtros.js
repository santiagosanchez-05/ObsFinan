// Monserrat — US33 (filtros del dashboard SPE: semestre y dimensión).
//
// Contrato: recibe req.query y devuelve los filtros ya validados que usa
// obtenerDashboardSpe (Liz). Liz agrega `rubro` cuando haga US34.
//   parsearFiltrosSpe({ year: '2026', semester: '1', dimension: 'barreras' })
//     -> { year: 2026, semester: 1, dimension: 'barreras' }
// Lo que no venga o sea inválido, no se incluye (= sin filtro).
function parsearFiltrosSpe(query = {}) {
  return {};
}

module.exports = { parsearFiltrosSpe };
