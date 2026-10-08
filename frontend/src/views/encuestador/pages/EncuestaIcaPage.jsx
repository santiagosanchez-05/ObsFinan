import { useParams } from 'react-router-dom';
import ICARegisterPage from '../../ica/pages/ICARegisterPage';

export default function EncuestaIcaPage() {
  const { eventId } = useParams();
  return <ICARegisterPage eventId={eventId} encuestador />;
}
