import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Filter,
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MisEncuestasPage() {
  const { token } = useAuth();

  const [encuestas, setEncuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas' | 'pendiente' | 'aprobada' | 'rechazada'
  const [filtroModulo, setFiltroModulo] = useState('todos'); // 'todos' | 'ICA' | 'SPE'

  useEffect(() => {
    let activo = true;

    async function cargarEncuestas() {
      try {
        setCargando(true);
        setError(null);

        const res = await fetch('/api/encuestas/mias', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('No se pudo obtener el historial de tus encuestas.');
        }

        const data = await res.json();
        if (activo) {
          setEncuestas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al cargar encuestas.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarEncuestas();
    return () => {
      activo = false;
    };
  }, [token]);

  const encuestasFiltradas = useMemo(() => {
    return encuestas.filter((enc) => {
      const coincideEstado = filtroEstado === 'todas' || enc.estado === filtroEstado;
      const coincideModulo = filtroModulo === 'todos' || enc.modulo === filtroModulo;
      return coincideEstado && coincideModulo;
    });
  }, [encuestas, filtroEstado, filtroModulo]);

  const conteoEstados = useMemo(() => {
    const pendientes = encuestas.filter((e) => e.estado === 'pendiente').length;
    const aprobadas = encuestas.filter((e) => e.estado === 'aprobada').length;
    const rechazadas = encuestas.filter((e) => e.estado === 'rechazada').length;
    return { pendientes, aprobadas, rechazadas, total: encuestas.length };
  }, [encuestas]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Cabecera */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
            Panel del Encuestador
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Estado de Mis Encuestas
          </h1>
          <p className="mt-1 text-xs text-ink/60">
            Seguimiento en tiempo real de las encuestas que has enviado para revisión y aprobación
          </p>
        </div>

        {/* Resumen de estados y filtros */}
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltroEstado('todas')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtroEstado === 'todas'
                    ? 'bg-maroon text-white'
                    : 'bg-surface text-ink/70 hover:bg-ink/5'
                }`}
              >
                Todas ({conteoEstados.total})
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('pendiente')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtroEstado === 'pendiente'
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Pendientes ({conteoEstados.pendientes})</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('aprobada')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtroEstado === 'aprobada'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Aprobadas ({conteoEstados.aprobadas})</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('rechazada')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtroEstado === 'rechazada'
                    ? 'bg-rose-600 text-white'
                    : 'bg-surface text-rose-700 hover:bg-rose-50'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Rechazadas ({conteoEstados.rechazadas})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-ink/40" />
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-ink focus:border-maroon focus:outline-hidden"
              >
                <option value="todos">Todos los módulos</option>
                <option value="ICA">Solo ICA</option>
                <option value="SPE">Solo SPE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estados de carga y error */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-20 text-ink/60">
            <Loader2 className="h-8 w-8 animate-spin text-maroon" />
            <p className="mt-3 text-xs font-medium">Consultando estado de tus encuestas...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Estado vacío */}
        {!cargando && !error && encuestasFiltradas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-12 text-center shadow-xs space-y-3">
            <FileText className="mx-auto h-10 w-10 text-ink/30" />
            <h3 className="text-sm font-semibold text-ink">No hay encuestas para mostrar</h3>
            <p className="text-xs text-ink/50 max-w-sm mx-auto">
              {filtroEstado !== 'todas' || filtroModulo !== 'todos'
                ? 'No se encontraron encuestas con los filtros seleccionados.'
                : 'Aún no has registrado ninguna encuesta. Cuando envíes una encuesta ICA o SPE desde tus eventos asignados, aparecerá aquí.'}
            </p>
          </div>
        )}

        {/* Listado de encuestas */}
        {!cargando && !error && encuestasFiltradas.length > 0 && (
          <div className="space-y-3.5">
            {encuestasFiltradas.map((enc) => {
              const esAprobada = enc.estado === 'aprobada';
              const esRechazada = enc.estado === 'rechazada';

              return (
                <div
                  key={enc.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-colors ${
                    esRechazada
                      ? 'border-rose-200 hover:border-rose-300'
                      : esAprobada
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            esAprobada
                              ? 'bg-emerald-100 text-emerald-800'
                              : esRechazada
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {esAprobada ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Aprobada</span>
                            </>
                          ) : esRechazada ? (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Rechazada</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            enc.modulo === 'ICA'
                              ? 'bg-maroon/10 text-maroon'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {enc.modulo}
                        </span>

                        <span className="text-[11px] font-medium text-ink/50">
                          {enc.tipoCarga === 'archivo' ? 'Carga masiva' : 'Carga individual'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-ink">{enc.nombre}</h3>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-ink/50 sm:text-right shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-ink/40" />
                      <span>Enviado: {formatearFecha(enc.fechaCarga)}</span>
                    </div>
                  </div>

                  {/* Detalle de revisión */}
                  {(enc.revisadoPor || enc.fechaRevision || esRechazada) && (
                    <div className="mt-3.5 pt-3 border-t border-ink/5 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3 text-ink/65">
                        {enc.revisadoPor && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-ink/40" />
                            <span>
                              Revisado por: <strong className="text-ink">{enc.revisadoPor}</strong>
                            </span>
                          </div>
                        )}
                        {enc.fechaRevision && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-ink/40" />
                            <span>El {formatearFecha(enc.fechaRevision)}</span>
                          </div>
                        )}
                      </div>

                      {/* Motivo de rechazo destacado */}
                      {esRechazada && enc.motivoRechazo && (
                        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900">
                          <p className="font-semibold text-rose-800 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>Motivo del rechazo:</span>
                          </p>
                          <p className="mt-0.5 text-rose-700 pl-5">{enc.motivoRechazo}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
