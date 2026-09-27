import BloquePendiente from '../../../shared/BloquePendiente';

// Kevin Prieto — US40 (descargar dataset SPE en CSV o JSON).
//
// Props: filtros = los filtros aplicados en el dashboard, para exportar lo
// mismo que se está viendo (GET /api/spe/export?formato=csv|json&...).
// Es público: sin sesión no mandes el header Authorization (ver ICAPage).
export default function ExportarSpe({ filtros }) { // eslint-disable-line no-unused-vars
  return <BloquePendiente texto="Descargar CSV / JSON" historia="US40" encargado="Kevin Prieto" />;
}
