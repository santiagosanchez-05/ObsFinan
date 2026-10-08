import { useEffect, useMemo, useState } from 'react';
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
  Eye,
  Trash2,
  Landmark,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

const COLUMNAS_ORDENABLES = {
  sector: 'Sector exportador',
  departamento: 'Departamento',
  periodo: 'Periodo',
  fecha: 'Fecha de carga',
};

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
  { valor: 'rechazada', etiqueta: 'Rechazada' },
];

const ESTILO_ESTADO = {
  Aprobada: 'bg-[#eaf6ef] text-[#2f9e58]',
  Pendiente: 'bg-[#fbf1de] text-[#b7891e]',
  Rechazada: 'bg-[#fdeaea] text-[#c0392b]',
};

const PAGE_SIZE = 10;
const SEMESTRES = [1, 2];

const CLASE_SELECT =
  'appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]';

function formatearFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function HistorialSpePage() {
  const { token } = useAuth();

  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');

  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState(null);
  const [anios, setAnios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recargarClave, setRecargarClave] = useState(0);

  const [registroAEliminar, setRegistroAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // Debounce del buscador
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setBusqueda(busquedaInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [busquedaInput]);

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
      if (year) params.set('year', year);
      if (semester) params.set('semester', semester);
      if (departamento) params.set('departamento', departamento);
      if (estado) params.set('estado', estado);
      if (busqueda) params.set('busqueda', busqueda);

      try {
        const res = await fetch(`/api/spe/historial?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'No se pudo cargar el historial');

        const data = json.data ?? json;
        if (!cancelado) {
          setRegistros(data.registros ?? []);
          setTotal(data.total ?? 0);
          setResumen(data.resumen ?? null);
          setAnios(data.anios ?? []);
          setDepartamentos(data.departamentos ?? []);
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
  }, [token, year, semester, departamento, estado, busqueda, page, sortBy, sortDir, recargarClave]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tarjetas = useMemo(
    () => [
      { label: 'Total registros', valor: resumen?.totalRegistros ?? '-', Icono: Landmark, estilo: 'bg-[#fbe9f0] text-[#a00046]' },
      { label: 'Pendientes', valor: resumen?.pendientes ?? '-', Icono: Clock, estilo: 'bg-[#fbf1de] text-[#b7891e]' },
      { label: 'Aprobados', valor: resumen?.aprobadas ?? '-', Icono: CheckCircle2, estilo: 'bg-[#eaf6ef] text-[#2f9e58]' },
      { label: 'Rechazados', valor: resumen?.rechazadas ?? '-', Icono: XCircle, estilo: 'bg-[#fdeaea] text-[#c0392b]' },
    ],
    [resumen],
  );

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPage(1);
    };
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
    if (sortBy !== columna) return <ChevronsUpDown size={11} className="text-[#c3c9c7]" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  function Encabezado({ columna }) {
    return (
      <th className="px-4 py-3">
        <button onClick={() => alternarOrden(columna)} className="inline-flex items-center gap-1 hover:text-[#a00046]">
          {COLUMNAS_ORDENABLES[columna]} <IconoOrden columna={columna} />
        </button>
      </th>
    );
  }

  async function confirmarEliminacion() {
    if (!registroAEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/spe/${registroAEliminar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || 'No se pudo eliminar el registro');
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
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <ConfirmDialog
        open={Boolean(registroAEliminar)}
        titulo="¿Eliminar este registro?"
        mensaje="Este registro dejará de contar para los dashboards. Esta acción no se puede deshacer."
        textoConfirmar={eliminando ? 'Eliminando...' : 'Eliminar'}
        onConfirm={confirmarEliminacion}
        onCancel={() => setRegistroAEliminar(null)}
      />

      <div className="mx-auto max-w-[1120px]">
        <Link
          to="/spe"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"
        >
          <ArrowLeft size={13} /> Volver al Dashboard SPE
        </Link>

        {/* Encabezado */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">
              Historial de registros — Sector Privado Exportador
            </h1>
            <p className="mt-1 text-sm text-[#6d7673]">
              Todos los registros ingresados para el Sector Privado Exportador.
            </p>
          </div>

          <Link
            to="/spe/registrar"
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039] sm:self-auto"
          >
            <Plus size={14} /> Nuevo Registro
          </Link>
        </div>

        {/* Filtros y búsqueda */}
        <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select value={departamento} onChange={(e) => cambiarFiltro(setDepartamento)(e.target.value)} className={CLASE_SELECT}>
                <option value="">Todos los departamentos</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <div className="relative">
              <select value={year} onChange={(e) => cambiarFiltro(setYear)(e.target.value)} className={CLASE_SELECT}>
                <option value="">Todos los años</option>
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <div className="relative">
              <select value={semester} onChange={(e) => cambiarFiltro(setSemester)(e.target.value)} className={CLASE_SELECT}>
                <option value="">Todos los semestres</option>
                {SEMESTRES.map((s) => (
                  <option key={s} value={s}>Semestre {s}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <div className="relative">
              <select value={estado} onChange={(e) => cambiarFiltro(setEstado)(e.target.value)} className={CLASE_SELECT}>
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <label className="relative min-w-[220px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]" />
              <input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Buscar por sector..."
                className="w-full rounded-lg border border-[#dfe4e5] bg-white py-2 pl-8 pr-3 text-xs text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
          </div>
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
                  <Encabezado columna="sector" />
                  <Encabezado columna="departamento" />
                  <Encabezado columna="periodo" />
                  <Encabezado columna="fecha" />
                  <th className="px-4 py-3">Estado</th>
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
                      <td className="px-4 py-3 font-semibold text-[#252927]">{r.sector || '—'}</td>
                      <td className="px-4 py-3">{r.departamento || '—'}</td>
                      <td className="px-4 py-3">{r.periodo}</td>
                      <td className="px-4 py-3">{formatearFecha(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${ESTILO_ESTADO[r.estado] || 'bg-[#f1f3f3] text-[#414845]'}`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 text-[#8a9290]">
                          <Link to={`/spe/historial/${r.id}`} className="hover:text-[#a00046]">
                            <Eye size={14} />
                          </Link>
                          <button onClick={() => setRegistroAEliminar(r)} className="hover:text-[#a00046]">
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

        {/* Tarjetas de resumen */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tarjetas.map(({ label, valor, Icono, estilo }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo}`}>
                <Icono size={16} />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p>
                <p className="text-xl font-bold text-[#202522]">{valor}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}