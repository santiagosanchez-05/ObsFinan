import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EventoForm from '../components/EventoForm';

// Santiago — US44. Registro de eventos (Admin: su sede; Superadmin: cualquiera).
export default function NuevoEventoPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/eventos" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <ArrowLeft size={14} /> Volver a la agenda
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Registrar evento</h1>
        <p className="mt-1 text-sm text-ink/60">Se publica en la agenda apenas lo guardes.</p>
        <EventoForm onGuardado={(id) => navigate(`/eventos/${id}`)} />
      </div>
    </main>
  );
}
