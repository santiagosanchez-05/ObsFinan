import { useParams } from 'react-router-dom';
import ICARegisterPage from '../../ica/pages/ICARegisterPage';
import EstadoEvento from '../components/EstadoEvento';
import { useEventoEncuesta } from '../useEventoEncuesta';

// Liz — US57. Mismo formulario que el registro individual del Admin, pero
// atado al evento: el período sale de su fecha y entra pendiente de aprobación.
export default function EncuestaIcaPage() {
  const { eventId } = useParams();
  const { evento, cargando, error } = useEventoEncuesta(eventId);

  if (cargando || error) return <EstadoEvento cargando={cargando} error={error} />;
  if (!evento.hasIca) return <EstadoEvento error="Este evento no habilita la encuesta ICA." />;
  return <ICARegisterPage eventId={eventId} evento={evento} encuestador />;
}
