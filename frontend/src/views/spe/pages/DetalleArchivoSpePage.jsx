import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';

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

export default function DetalleArchivoSpePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filtros y búsqueda local de la tabla
  const [busqueda, setBusqueda] = useState('');
  const [filtroDepto, setFiltroDepto] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10;

  // Diálogo de eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarDetalle() {
      try {
        setCargando(true);
        setError(null);

        const res = await fetch(`/api/spe/files/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('El archivo solicitado no existe o fue eliminado.');
          }
          if (res.status === 400) {
            throw new Error('El identificador de archivo proporcionado es inválido.');
          }
          throw new Error('Error al consultar el detalle del archivo.');
        }

        const json = await res.json();
        if (activo) {
          setData(json);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error inesperado al cargar archivo.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDetalle();
    return () => {
      activo = false;
    };
  }, [id, token]);

  const registrosTotales = data?.registros;

  const registrosFiltrados = useMemo(() => {
    if (!registrosTotales) return [];
    return registrosTotales.filter((reg) => {
      const coincideDepto = !filtroDepto || reg.s1_department === filtroDepto;
      const texto = `${reg.s1_export_sector || ''} ${reg.s1_company_size || ''} ${reg.s1_department || ''}`.toLowerCase();
      const coincideBusqueda = !busqueda || texto.includes(busqueda.toLowerCase());
      return coincideDepto && coincideBusqueda;
    });
  }, [registrosTotales, filtroDepto, busqueda]);

  const totalPaginas = Math.ceil(registrosFiltrados.length / filasPorPagina) || 1;
  const registrosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * filasPorPagina;
    return registrosFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [registrosFiltrados, paginaActual]);

  const confirmarEliminar = async () => {
    try {
      setEliminando(true);
      setErrorEliminacion(null);

      const res = await fetch(`/api/spe/files/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'No se pudo eliminar el archivo.');
      }

      setModalEliminarAbierto(false);
      navigate('/spe/historial');
    } catch (err) {
      console.error('Error eliminando archivo SPE:', err);
      setErrorEliminacion(err.message || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-24 text-ink/70">
          <Loader2 className="h-8 w-8 animate-spin text-maroon" />
          <p className="mt-3 text-sm font-medium">Cargando detalle del archivo SPE...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/spe/historial"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-maroon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al historial</span>
          </Link>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900 shadow-xs">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
            <h2 className="mt-2 text-base font-semibold">No se pudo cargar el archivo</h2>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <div className="mt-4">
              <Link
                to="/spe/historial"
                className="inline-flex items-center rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white hover:bg-maroon-light"
              >
                Regresar al Historial
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { archivo } = data;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Cabecera y botón volver */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/spe/historial"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-maroon transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al historial</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">
              {archivo.nombre}
            </h1>
            <p className="mt-0.5 text-xs text-ink/60">
              Detalle y respuestas registradas del dataset SPE
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalEliminarAbierto(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-xs hover:bg-rose-50 hover:border-rose-300 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Eliminar archivo</span>
            </button>
          </div>
        </div>

        {errorEliminacion && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            {errorEliminacion}
          </div>
        )}

        {/* Tarjeta de metadatos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-surface p-2.5 text-maroon">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-ink/60">Tipo de carga</p>
                <p className="text-sm font-semibold text-ink">{archivo.tipoCargaTexto}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-surface p-2.5 text-sky-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-ink/60">Fecha de subida</p>
                <p className="text-sm font-semibold text-ink">{formatearFecha(archivo.fechaCarga)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-surface p-2.5 text-violet-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-ink/60">Registrado por</p>
                <p className="text-sm font-semibold text-ink">{archivo.subidoPor}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-surface p-2.5 text-emerald-600">
                {archivo.estado === 'aprobada' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : archivo.estado === 'rechazada' ? (
                  <XCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium text-ink/60">Estado</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    archivo.estado === 'aprobada'
                      ? 'bg-emerald-100 text-emerald-800'
                      : archivo.estado === 'rechazada'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {archivo.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de registros */}
        <div className="rounded-2xl border border-ink/10 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Empresas encuestadas ({archivo.totalRegistros})
              </h2>
              <p className="text-xs text-ink/60">Lista de respuestas registradas en esta carga</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink/40" />
                <input
                  type="text"
                  placeholder="Buscar sector, tamaño..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="rounded-lg border border-ink/15 bg-white py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink/40 focus:border-maroon focus:outline-hidden"
                />
              </div>

              <select
                value={filtroDepto}
                onChange={(e) => {
                  setFiltroDepto(e.target.value);
                  setPaginaActual(1);
                }}
                className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs text-ink focus:border-maroon focus:outline-hidden"
              >
                <option value="">Todos los departamentos</option>
                <option value="Santa Cruz">Santa Cruz</option>
                <option value="La Paz">La Paz</option>
                <option value="Cochabamba">Cochabamba</option>
              </select>
            </div>
          </div>

          {registrosPaginados.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink/50">
              No se encontraron registros que coincidan con la búsqueda o filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="border-b border-ink/10 bg-surface/60 font-semibold text-ink/70">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Departamento</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Tamaño</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Expectativa PIB</th>
                    <th className="px-4 py-3">Nuevos mercados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {registrosPaginados.map((r, i) => (
                    <tr key={r.spe_survey_response_id || i} className="hover:bg-surface/40">
                      <td className="px-4 py-3 font-mono text-ink/60">
                        {r.spe_survey_response_id || i + 1}
                      </td>
                      <td className="px-4 py-3">
                        {r.year ? `${r.year} - S${r.semester}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.s1_department}</td>
                      <td className="px-4 py-3">{r.s1_export_sector}</td>
                      <td className="px-4 py-3">{r.s1_company_size}</td>
                      <td className="px-4 py-3">{r.s1_main_destination}</td>
                      <td className="px-4 py-3">{r.s2_gdp_expectation}</td>
                      <td className="px-4 py-3">{r.s3_plans_new_markets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-ink/10 px-4 py-3 text-xs text-ink/60">
              <span>
                Página {paginaActual} de {totalPaginas}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                  disabled={paginaActual === 1}
                  className="rounded-md border border-ink/15 px-2.5 py-1 font-medium disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="rounded-md border border-ink/15 px-2.5 py-1 font-medium disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={modalEliminarAbierto}
        titulo="¿Eliminar este archivo SPE?"
        mensaje={`Esta acción dará de baja lógica el archivo "${archivo.nombre}" y todos sus ${archivo.totalRegistros} registros asociados.`}
        textoConfirmar={eliminando ? 'Eliminando...' : 'Eliminar'}
        textoCancelar="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => setModalEliminarAbierto(false)}
      />
    </main>
  );
}
