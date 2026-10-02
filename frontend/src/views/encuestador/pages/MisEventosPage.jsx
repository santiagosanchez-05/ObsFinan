import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  FileCheck2,
  TrendingUp,
  Loader2,
  AlertCircle,
  ExternalLink,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

function formatearFecha(iso) {
  if (!iso) return '-';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function textoModalidad(mod) {
  switch (Number(mod)) {
    case 1:
      return 'Presencial';
    case 2:
      return 'Virtual';
    case 3:
      return 'Híbrido';
    default:
      return 'Presencial';
  }
}

export default function MisEventosPage() {
  const { token } = useAuth();

  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarEventos() {
      try {
        setCargando(true);
        setError(null);

        const res = await fetch('/api/events/mis-eventos', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('No se pudieron obtener tus eventos asignados.');
        }

        const data = await res.json();
        if (activo) {
          setEventos(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al cargar eventos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarEventos();
    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Cabecera */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
            Panel del Encuestador
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Mis Eventos Asignados
          </h1>
          <p className="mt-1 text-xs text-ink/60">
            Eventos en los que estás asignado para relevar encuestas ICA o SPE
          </p>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-20 text-ink/60">
            <Loader2 className="h-8 w-8 animate-spin text-maroon" />
            <p className="mt-3 text-xs font-medium">Cargando tus eventos asignados...</p>
          </div>
        )}

        {/* Estado de error */}
        {error && !cargando && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Estado vacío */}
        {!cargando && !error && eventos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-12 text-center shadow-xs space-y-3">
            <CalendarDays className="mx-auto h-10 w-10 text-ink/30" />
            <h3 className="text-sm font-semibold text-ink">No tienes eventos asignados</h3>
            <p className="text-xs text-ink/50 max-w-sm mx-auto">
              Actualmente no estás asignado a ningún evento activo. La coordinación te asignará a
              los eventos según la programación de tu sede.
            </p>
          </div>
        )}

        {/* Listado de eventos */}
        {!cargando && !error && eventos.length > 0 && (
          <div className="space-y-4">
            {eventos.map((ev) => {
              const tieneIca = Number(ev.has_ica) === 1;
              const tieneSpe = Number(ev.has_spe) === 1;

              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-ink/10 bg-white p-5 shadow-xs transition-colors hover:border-maroon/30 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink/70">
                          <Building2 className="h-3 w-3 text-maroon" />
                          <span>{ev.sede}</span>
                        </span>

                        <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/60">
                          {textoModalidad(ev.modalidad)}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-ink">{ev.titulo}</h2>

                      {ev.descripcion && (
                        <p className="text-xs text-ink/65 max-w-2xl leading-relaxed">
                          {ev.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 text-xs text-ink/60 shrink-0">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <Calendar className="h-3.5 w-3.5 text-maroon" />
                        <span>{formatearFecha(ev.fecha)}</span>
                      </div>
                      {ev.hora && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-ink/40" />
                          <span>{String(ev.hora).slice(0, 5)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-ink/5 text-xs text-ink/70">
                    <div className="flex flex-wrap items-center gap-4">
                      {ev.lugar && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-ink/40" />
                          <span>{ev.lugar}</span>
                        </div>
                      )}

                      {ev.enlaceExterno && (
                        <a
                          href={ev.enlaceExterno}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-maroon hover:underline font-medium"
                        >
                          <span>Enlace del evento</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Botones de acción según has_ica y has_spe */}
                    <div className="flex flex-wrap items-center gap-2">
                      {tieneIca && (
                        <Link
                          to={`/encuestador/eventos/${ev.id}/ica`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-maroon px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-maroon-light transition-colors"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>Registrar encuesta ICA</span>
                        </Link>
                      )}

                      {tieneSpe && (
                        <Link
                          to={`/encuestador/eventos/${ev.id}/spe`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Registrar encuesta SPE</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
