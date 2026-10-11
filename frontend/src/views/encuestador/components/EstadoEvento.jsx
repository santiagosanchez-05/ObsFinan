import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

// Mientras se carga el evento, o si no se pudo cargar / no habilita la encuesta.
export default function EstadoEvento({ cargando, error }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-card p-8 text-center shadow-sm">
        {cargando ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <p className="mt-3 text-xs font-medium text-muted">Cargando el evento...</p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-[#b42318]" />
            <p className="mt-3 text-sm font-semibold text-ink">{error}</p>
            <Link to="/encuestador/eventos" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
              <ArrowLeft size={13} /> Volver a mis eventos
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
