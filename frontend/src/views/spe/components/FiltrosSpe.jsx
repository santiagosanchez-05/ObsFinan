import BloquePendiente from '../../../shared/BloquePendiente';

// Monserrat — US33 (filtros: período, departamento, sector exportador y tamaño).
//
// Props (las pasa SPEPage de Liz, no hace falta tocar esa página):
//   filtros:   objeto actual, ej. { year: 2026, semester: 1, department: 'La Paz', sector: 'Textiles', size: 'Mediana' }
//   onAplicar: (nuevosFiltros) => void — llámalo al presionar "Aplicar filtros"
//   opciones:  opcionesFiltros que devuelve GET /api/spe (períodos, departamentos, sectores, tamaños)
// El filtro por sector es el de US34 (Liz): coordinen si hace falta algo más.
export default function FiltrosSpe({ filtros, onAplicar, opciones }) { // eslint-disable-line no-unused-vars
  return <BloquePendiente texto="Filtros: período, departamento, sector y tamaño" historia="US33" encargado="Monserrat" />;
}
