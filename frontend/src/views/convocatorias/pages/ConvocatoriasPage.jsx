import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

function formatearFecha(iso) {
  if (!iso) return '-';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ConvocatoriasPage() {
  const { token } = useAuth();

  const [convocatorias, setConvocatorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'abiertas' | 'cerradas'

  useEffect(() => {
    let activo = true;

    async function cargarConvocatorias() {
      try {
        setCargando(true);
        setError(null);

        const res = await fetch('/api/convocatorias', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('No se pudo cargar el listado de convocatorias.');
        }

        const data = await res.json();
        if (activo) {
          setConvocatorias(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al cargar convocatorias.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarConvocatorias();
    return () => {
      activo = false;
    };
  }, [token]);

  const convocatoriasFiltradas = useMemo(() => {
    return convocatorias.filter((c) => {
      const coincideEstado =
        filtroEstado === 'todas'
          ? true
          : filtroEstado === 'abiertas'
          ? c.estaAbierta
          : !c.estaAbierta;

      const coincideBusqueda =
        !busqueda ||
        c.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.sede.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

      return coincideEstado && coincideBusqueda;
    });
  }, [convocatorias, filtroEstado, busqueda]);

  const totalAbiertas = useMemo(() => convocatorias.filter((c) => c.estaAbierta).length, [convocatorias]);
  const totalCerradas = useMemo(() => convocatorias.filter((c) => !c.estaAbierta).length, [convocatorias]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
              Reclutamiento y Selección
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              Convocatorias de Encuestadores
            </h1>
            <p className="mt-1 text-xs text-ink/60">
              Administración y seguimiento de postulaciones de encuestadores por sede
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/convocatorias/nueva"
              className="inline-flex items-center gap-2 rounded-xl bg-maroon px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-maroon-light transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva convocatoria</span>
            </Link>
          </div>
        </div>

        {/* Barra de métricas y filtros */}
        <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltroEstado('todas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtroEstado === 'todas'
                  ? 'bg-maroon text-white'
                  : 'bg-surface text-ink/70 hover:bg-ink/5'
              }`}
            >
              Todas ({convocatorias.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('abiertas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtroEstado === 'abiertas'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-surface text-ink/70 hover:bg-ink/5'
              }`}
            >
              Abiertas ({totalAbiertas})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('cerradas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtroEstado === 'cerradas'
                  ? 'bg-ink/80 text-white'
                  : 'bg-surface text-ink/70 hover:bg-ink/5'
              }`}
            >
              Cerradas ({totalCerradas})
            </button>
          </div>

          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
            <input
              type="text"
              placeholder="Buscar convocatoria o sede..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-white py-1.5 pl-9 pr-3 text-xs text-ink placeholder:text-ink/40 focus:border-maroon focus:outline-hidden"
            />
          </div>
        </div>

        {/* Estados de carga y error */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-20 text-ink/60">
            <Loader2 className="h-7 w-7 animate-spin text-maroon" />
            <p className="mt-3 text-xs font-medium">Cargando convocatorias...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Listado */}
        {!cargando && !error && convocatoriasFiltradas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-12 text-center shadow-xs">
            <Users className="mx-auto h-10 w-10 text-ink/30" />
            <h3 className="mt-3 text-sm font-semibold text-ink">No hay convocatorias disponibles</h3>
            <p className="mt-1 text-xs text-ink/50">
              {busqueda || filtroEstado !== 'todas'
                ? 'No se encontraron resultados para los filtros seleccionados.'
                : 'Aún no se han registrado convocatorias de encuestadores.'}
            </p>
          </div>
        )}

        {!cargando && !error && convocatoriasFiltradas.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {convocatoriasFiltradas.map((conv) => (
              <div
                key={conv.id}
                className="flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-5 shadow-xs hover:border-maroon/30 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        conv.estaAbierta
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-ink/10 text-ink/70'
                      }`}
                    >
                      {conv.estaAbierta ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Abierta</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>Cerrada</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/60">
                      <Building2 className="h-3.5 w-3.5 text-maroon" />
                      <span>{conv.sede}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-ink leading-snug">{conv.titulo}</h3>
                    {conv.descripcion && (
                      <p className="mt-1 text-xs text-ink/60 line-clamp-2">{conv.descripcion}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-ink/5 text-xs text-ink/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-ink/40" />
                      <span>
                        {formatearFecha(conv.fechaInicio)} al {formatearFecha(conv.fechaFin)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-ink/40" />
                      <span className="font-semibold text-ink">
                        {conv.totalPostulantes} postulante{conv.totalPostulantes === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-ink/5">
                  <Link
                    to={`/convocatorias/${conv.id}/postulantes`}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink/15 bg-white py-2 text-xs font-semibold text-ink hover:bg-maroon hover:text-white hover:border-maroon transition-colors"
                  >
                    <span>Ver postulantes</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
