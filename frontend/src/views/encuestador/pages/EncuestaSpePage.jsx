import { useParams } from 'react-router-dom';
import RegistrarSpePage from '../../spe/pages/RegistrarSpePage';
import EstadoEvento from '../components/EstadoEvento';
import { useEventoEncuesta } from '../useEventoEncuesta';

// Kevin Alanes — US66. Mismo formulario SOCOMEX–SOCIFIN que el registro del
// Superadmin (US37), atado al evento: el período sale de su fecha y la
// encuesta entra pendiente de aprobación (US62).
export default function EncuestaSpePage() {
  const { eventId } = useParams();
  const { evento, cargando, error } = useEventoEncuesta(eventId);

  if (cargando || error) return <EstadoEvento cargando={cargando} error={error} />;
  if (!evento.hasSpe) return <EstadoEvento error="Este evento no habilita la encuesta SPE." />;
  return <RegistrarSpePage evento={evento} />;
}
