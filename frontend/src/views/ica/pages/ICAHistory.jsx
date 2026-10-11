import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Plus,
  SquarePen,
  Eye,
  Trash2,
  Info,
  Loader2,
} from 'lucide-react';



// Columnas sobre las que se puede ordenar, clickeando su encabezado.
const COLUMNAS_ORDENABLES = {
  comuna: 'Comuna',
  periodo: 'Periodo',
  fecha: 'Fecha de carga',
};

const PAGE_SIZE = 10;

function formatearFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// US24: todos los registros son individuales (la carga por archivo se quitó).
function rutaEliminar(registro) {
  return `/api/ica/${registro.id}`;
}

export default function ICAHistory() {
  const { token } = useAuth();
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');

  const [comunidades, setComunidades] = useState([]);

  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recargarClave, setRecargarClave] = useState(0);

  // Registro pendiente de confirmar borrado (o null si el diálogo está cerrado).
  const [registroAEliminar, setRegistroAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Debounce del buscador: esperamos 400ms sin tipeo antes de disparar la consulta,
  // para no pegarle al backend en cada tecla.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setBusqueda(busquedaInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [busquedaInput]);

  // Comunas para el dropdown de filtro (mismo endpoint que ya usa el dashboard).
  useEffect(() => {
    let cancelado = false;

    async function cargarComunidades() {
      try {
        const res = await fetch('/api/ica/comunidades', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las comunas');
        if (!cancelado) setComunidades(data.comunidades ?? []);
      } catch {
        // Si falla, el filtro de comuna simplemente no se llena; no bloqueamos la tabla por esto.
      }
    }

    cargarComunidades();
    return () => {
      cancelado = true;
    };
  }, [token]);

  // Historial de registros
  useEffect(() => {
    let cancelado = false;

    async function cargarHistorial() {
      setCargando(true);
      setError('');
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy,
        sortDir,
      });
      if (communityId) params.set('communityId', communityId);
      if (busqueda) params.set('busqueda', busqueda);
      if (estado) params.set('estado', estado);
      try {
        const res = await fetch(`/api/ica/historial?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial');
        if (!cancelado) {
          setRegistros(data.registros ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        if (!cancelado) setError(err.message || 'Error de conexión con el servidor');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [token, communityId, estado, busqueda, page, sortBy, sortDir, recargarClave]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function cambiarComunidad(valor) {
    setCommunityId(valor);
    setPage(1);
  }

  function alternarOrden(columna) {
    if (sortBy === columna) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columna);
      setSortDir('asc');
    }
    setPage(1);
  }

  function IconoOrden({ columna }) {
    if (sortBy !== columna) return <ChevronsUpDown size={11} className="text-muted" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  async function confirmarEliminacion() {
    if (!registroAEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(rutaEliminar(registroAEliminar), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el registro');
      setRegistroAEliminar(null);
      setRecargarClave((c) => c + 1);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el registro');
      setRegistroAEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <ConfirmDialog
        open={Boolean(registroAEliminar)}
        titulo="¿Eliminar este registro?"
        mensaje="Este registro individual dejará de contar para los dashboards. Esta acción no se puede deshacer."
        textoConfirmar={eliminando ? 'Eliminando...' : 'Eliminar'}
        onConfirm={confirmarEliminacion}
        onCancel={() => setRegistroAEliminar(null)}
      />

      <div className="mx-auto max-w-[1120px]">
        {/* Breadcrumb */}
        <Link
          to="/ica"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <ArrowLeft size={13} /> Volver al Dashboard ICA
        </Link>

        {/* Encabezado */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Historial de registros — ICA
          </h1>
          <p className="mt-1 text-sm text-muted">
            Todos los registros individuales del Índice de Calidad Aseguradora.
          </p>
        </div>

        {/* Barra de tabs, filtro, búsqueda y acción */}
        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">

            <div className="relative">
              <select
                value={communityId}
                onChange={(e) => cambiarComunidad(e.target.value)}
                className="appearance-none rounded-lg border border-line bg-card py-2 pl-3 pr-8 text-xs font-semibold text-ink-2 outline-none focus:border-brand"
              >
                <option value="">Filtrar por Comuna</option>
                {comunidades.map((c) => (
                  <option key={c.id} value={c.id}>{new Set(comunidades.map((x) => x.campusId)).size > 1 && c.sede ? `${c.nombre} (${c.sede})` : c.nombre}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <div className="relative">
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-lg border border-line bg-card py-2 pl-3 pr-8 text-xs font-semibold text-ink-2 outline-none focus:border-brand"
              >
                <option value="">Filtrar por Estado</option>
                <option value="verificado">Verificado</option>
                <option value="no_verificado">No verificado</option>
                <option value="rechazado">Rechazado</option>
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Buscar por comuna..."
                className="w-64 rounded-lg border border-line bg-card py-2 pl-8 pr-3 text-xs text-ink-2 outline-none focus:border-brand"
              />
            </label>
          </div>

          <Link
            to="/ica/registrar"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-maroon-dark"
          >
            <Plus size={14} /> Nuevo Registro
          </Link>
        </section>

        {error && (
          <p className="mb-5 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>
        )}

        {/* Tabla */}
        <section className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-subtle text-[9px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('comuna')} className="inline-flex items-center gap-1 hover:text-brand">
                      {COLUMNAS_ORDENABLES.comuna} <IconoOrden columna="comuna" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('periodo')} className="inline-flex items-center gap-1 hover:text-brand">
                      {COLUMNAS_ORDENABLES.periodo} <IconoOrden columna="periodo" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Registros</th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('fecha')} className="inline-flex items-center gap-1 hover:text-brand">
                      {COLUMNAS_ORDENABLES.fecha} <IconoOrden columna="fecha" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      <Loader2 size={16} className="mx-auto mb-2 animate-spin" />
                      Cargando historial...
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      No hay registros que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="border-t border-line text-ink-2 hover:bg-brand-soft">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3ecfb] dark:bg-white/10 text-[#7c4dbd] dark:text-[#b79be8]">
                            <SquarePen size={14} />
                          </span>
                          <div>
                            <p className="font-semibold text-ink">{r.origen}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#7c4dbd] dark:text-[#b79be8]">Manual</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.comuna}</td>
                      <td className="px-4 py-3">{r.periodo}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-subtle px-2 py-1 text-[10px] font-bold text-ink-2">
                          {r.registros}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatearFecha(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.estado === 'Verificado'
                              ? 'bg-[#eaf6ef] dark:bg-white/10 text-[#2f9e58]'
                              : r.estado === 'Rechazado'
                                ? 'bg-[#fdeaea] dark:bg-white/10 text-[#dc2626]'
                                : 'bg-[#fbf1de] dark:bg-white/10 text-[#b7891e]'
                            }`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 text-muted">
                          <Link to={`/ica/historial/${r.id}`} className="hover:text-brand"><Eye size={14} /></Link>
                          <button onClick={() => setRegistroAEliminar(r)} className="hover:text-brand">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {registros.length} de {total} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-line px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="rotate-90" />
              </button>
              <span className="px-2 font-semibold text-ink-2">
                Página {page} de {totalPaginas}
              </span>
              <button
                disabled={page >= totalPaginas}
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                className="rounded border border-line px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
        </section>


      </div>
    </main>
  );
}