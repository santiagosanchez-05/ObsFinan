import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Plus,
  Folder,
  SquarePen,
  Eye,
  Trash2,
  Info,
  Loader2,
} from 'lucide-react';

const TABS = [
  { id: 'todos', label: 'Todos', tipo: undefined },
  { id: 'individuales', label: 'Registros individuales', tipo: 'individuales' },
  { id: 'archivos', label: 'Archivos', tipo: 'archivos' },
];

const PAGE_SIZE = 10;

function formatearFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ICAHistory() {
  const { token } = useAuth();

  const [tab, setTab] = useState('todos');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [page, setPage] = useState(1);

  const [comunidades, setComunidades] = useState([]);

  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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

      const tipoActual = TABS.find((t) => t.id === tab)?.tipo;
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (tipoActual) params.set('tipo', tipoActual);
      if (communityId) params.set('communityId', communityId);
      if (busqueda) params.set('busqueda', busqueda);

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
  }, [token, tab, communityId, busqueda, page]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function cambiarTab(idTab) {
    setTab(idTab);
    setPage(1);
  }

  function cambiarComunidad(valor) {
    setCommunityId(valor);
    setPage(1);
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        {/* Breadcrumb */}
        <Link
          to="/ica"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"
        >
          <ArrowLeft size={13} /> Volver al Dashboard ICA
        </Link>

        {/* Encabezado */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">
            Historial de registros — ICA
          </h1>
          <p className="mt-1 text-sm text-[#6d7673]">
            Todos los registros ingresados manualmente o cargados por archivo para el Índice de Ahorro Comunitario.
          </p>
        </div>

        {/* Barra de tabs, filtro, búsqueda y acción */}
        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-[#f4f6f8] p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => cambiarTab(t.id)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${tab === t.id
                    ? 'bg-white text-[#202522] shadow-sm'
                    : 'text-[#8a9290] hover:text-[#59615e]'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={communityId}
                onChange={(e) => cambiarComunidad(e.target.value)}
                className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
              >
                <option value="">Filtrar por Comuna</option>
                {comunidades.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]" />
              <input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Buscar por archivo o comuna..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-64 rounded-lg border border-[#dfe4e5] bg-white py-2 pl-8 pr-3 text-xs text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
          </div>

          <Link
            to="/ica/registrar"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039]"
          >
            <Plus size={14} /> Nuevo Registro
          </Link>
        </section>

        {error && (
          <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Tabla */}
        <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                <tr>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Comuna</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Registros</th>
                  <th className="px-4 py-3">Fecha de carga</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8a9290]">
                      <Loader2 size={16} className="mx-auto mb-2 animate-spin" />
                      Cargando historial...
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8a9290]">
                      No hay registros que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${r.tipo === 'masiva' ? 'bg-[#e8f1fb] text-[#2f6fb0]' : 'bg-[#f3ecfb] text-[#7c4dbd]'
                              }`}
                          >
                            {r.tipo === 'masiva' ? <Folder size={14} /> : <SquarePen size={14} />}
                          </span>
                          <div>
                            <p className="font-semibold text-[#252927]">{r.origen}</p>
                            <p
                              className={`text-[9px] font-bold uppercase tracking-wider ${r.tipo === 'masiva' ? 'text-[#2f6fb0]' : 'text-[#7c4dbd]'
                                }`}
                            >
                              {r.tipo === 'masiva' ? 'Carga masiva' : 'Manual'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.comuna}</td>
                      <td className="px-4 py-3">{r.periodo}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f1f3f3] px-2 py-1 text-[10px] font-bold text-[#414845]">
                          {r.registros}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatearFecha(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 text-[#8a9290]">
                          {r.tipo === 'masiva' ? (
                            <Link to={`/ica/historial/${r.id}`} className="hover:text-[#a00046]"><Eye size={14} /></Link>
                          ) : (
                            <button className="hover:text-[#a00046]"><SquarePen size={14} /></button>
                          )}
                          <button className="hover:text-[#a00046]"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {registros.length} de {total} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="rotate-90" />
              </button>
              <span className="px-2 font-semibold text-[#59615e]">
                Página {page} de {totalPaginas}
              </span>
              <button
                disabled={page >= totalPaginas}
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
        </section>

        {/* Ayuda carga masiva */}
        <section className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#f0d6e0] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a00046] text-white">
              <Info size={14} />
            </span>
            <div>
              <p className="text-xs font-bold text-[#252927]">¿Necesitas ayuda con la carga masiva?</p>
              <p className="mt-0.5 text-[11px] text-[#8a9290]">
                Descarga nuestra guía de usuario o el formato oficial de Excel para evitar errores durante el procesamiento de datos ICA.
              </p>
            </div>
          </div>
          <a
            //   href="/plantillas/formato_ica.xlsx"
            //   download
            className="shrink-0 rounded-lg border border-[#a00046] px-4 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fff3f7]"
          >
            Ver Guía
          </a>
        </section>
      </div>
    </main>
  );
}