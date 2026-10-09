import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

// Mientras se carga el evento, o si no se pudo cargar / no habilita la encuesta.
export default function EstadoEvento({ cargando, error }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-[#e2e6e8] bg-white p-8 text-center shadow-sm">
        {cargando ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#a00046]" />
            <p className="mt-3 text-xs font-medium text-[#6d7673]">Cargando el evento...</p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-[#b42318]" />
            <p className="mt-3 text-sm font-semibold text-[#252927]">{error}</p>
            <Link to="/encuestador/eventos" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline">
              <ArrowLeft size={13} /> Volver a mis eventos
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
