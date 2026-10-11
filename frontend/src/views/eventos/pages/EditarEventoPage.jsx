import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import EventoForm from '../components/EventoForm';
import { headersDe, puedeGestionarEvento } from '../eventosUtils';

// Santiago — US45. Edición de eventos (Admin: solo los de su sede).
export default function EditarEventoPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [evento, setEvento] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/events/${id}`, { headers: headersDe(token) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(res.status === 404 ? 'Este evento no existe o fue eliminado' : data.error);
        if (!cancelado) setEvento(data);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message || 'No se pudo cargar el evento');
      });
    return () => {
      cancelado = true;
    };
  }, [id, token]);

  const sinPermiso = evento && !puedeGestionarEvento(user, evento);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to={`/eventos/${id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <ArrowLeft size={14} /> Volver al evento
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Editar evento</h1>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        {sinPermiso && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
            Solo puedes editar eventos de tu sede.
          </p>
        )}
        {!evento && !error && <p className="mt-6 text-sm text-ink/50">Cargando evento…</p>}
        {evento && !sinPermiso && <EventoForm evento={evento} onGuardado={(eventId) => navigate(`/eventos/${eventId}`)} />}
      </div>
    </main>
  );
}
