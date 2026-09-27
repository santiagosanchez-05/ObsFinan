import BloquePendiente from '../../../shared/BloquePendiente';

// Kevin Alanes — US36 (insights del SPE).
//
// Props: insights = [{ tono: 'verde' | 'rojo' | 'dorado' | 'gris', texto }]
// (lo calcula calcularInsightsSpe en backend/src/modules/spe/spe.insights.service.js,
// que también es tuyo). Mismo estilo visual que los hallazgos del dashboard ICA.
export default function InsightsSpe({ insights }) { // eslint-disable-line no-unused-vars
  return <BloquePendiente texto="Insights: hallazgos clave del período" historia="US36" encargado="Kevin Alanes" />;
}
