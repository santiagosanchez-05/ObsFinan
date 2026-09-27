import BloquePendiente from '../../../shared/BloquePendiente';

// Monserrat — US33 (filtros por semestre y dimensión).
//
// Props (las pasa SPEPage de Liz, no hace falta tocar esa página):
//   filtros:   objeto actual, ej. { year: 2026, semester: 1, dimension: 'barreras' }
//   onAplicar: (nuevosFiltros) => void — llamalo al apretar "Aplicar filtros"
//   opciones:  opcionesFiltros que devuelve GET /api/spe (semestres disponibles, etc.)
// Liz suma el select de rubro (US34) cuando le toque — coordinen ese cambio.
export default function FiltrosSpe({ filtros, onAplicar, opciones }) { // eslint-disable-line no-unused-vars
  return <BloquePendiente texto="Filtros: semestre y dimensión" historia="US33" encargado="Monserrat" />;
}
