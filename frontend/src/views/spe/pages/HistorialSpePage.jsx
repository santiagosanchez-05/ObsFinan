import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Plus,
  Folder,
  SquarePen,
  Eye,
  Trash2,
  Landmark,
  Database,
  FileText,
  PenLine,
} from 'lucide-react';

// Monserrat — US38 · US39. Historial y carga de datasets SPE.
// ⚠️ SOLO VISUAL: datos de ejemplo, sin llamadas al backend.

const TABS = [
  { id: 'todos', label: 'Todos', tipo: undefined },
  { id: 'individuales', label: 'Registros individuales', tipo: 'manual' },
  { id: 'archivos', label: 'Archivos', tipo: 'masiva' },
];

const COLUMNAS_ORDENABLES = {
  sector: 'Sector exportador',
  periodo: 'Periodo',
  fecha: 'Fecha de carga',
};

const PAGE_SIZE = 10;

const PERIODOS = ['Semestre 2 - 2026', 'Semestre 1 - 2026', 'Semestre 2 - 2025'];

const REGISTROS_INICIALES = [
  { id: 1, tipo: 'masiva', origen: 'base_datos_santacruz.xlsx', sector: 'Agroindustria', periodo: 'Semestre 2 - 2026', registros: 42, fecha: '2026-10-24', estado: 'Verificado' },
  { id: 2, tipo: 'manual', origen: 'Registro individual', sector: 'Alimentos', periodo: 'Semestre 2 - 2026', registros: 1, fecha: '2026-10-22', estado: 'Verificado' },
  { id: 3, tipo: 'manual', origen: 'Registro individual', sector: 'Manufactura', periodo: 'Semestre 2 - 2026', registros: 1, fecha: '2026-10-18', estado: 'No verificado' },
  { id: 4, tipo: 'masiva', origen: 'export_manufactura_lapaz.csv', sector: 'Manufactura', periodo: 'Semestre 1 - 2026', registros: 12, fecha: '2026-10-06', estado: 'Verificado' },
  { id: 5, tipo: 'manual', origen: 'Registro individual', sector: 'Software y Servicios', periodo: 'Semestre 1 - 2026', registros: 1, fecha: '2026-09-02', estado: 'Verificado' },
  { id: 6, tipo: 'manual', origen: 'Registro individual', sector: 'Construcción', periodo: 'Semestre 1 - 2026', registros: 1, fecha: '2026-08-15', estado: 'No verificado' },
  { id: 7, tipo: 'masiva', origen: 'exportadores_cochabamba.xlsx', sector: 'Alimentos', periodo: 'Semestre 1 - 2026', registros: 27, fecha: '2026-08-03', estado: 'Verificado' },
  { id: 8, tipo: 'manual', origen: 'Registro individual', sector: 'Químico', periodo: 'Semestre 1 - 2026', registros: 1, fecha: '2026-07-19', estado: 'Verificado' },
  { id: 9, tipo: 'manual', origen: 'Registro individual', sector: 'Textiles', periodo: 'Semestre 2 - 2025', registros: 1, fecha: '2026-06-11', estado: 'No verificado' },
  { id: 10, tipo: 'masiva', origen: 'castanas_agroindustria_2025.csv', sector: 'Agroindustria', periodo: 'Semestre 2 - 2025', registros: 18, fecha: '2026-05-28', estado: 'Verificado' },
  { id: 11, tipo: 'manual', origen: 'Registro individual', sector: 'Otro', periodo: 'Semestre 2 - 2025', registros: 1, fecha: '2026-05-09', estado: 'Verificado' },
  { id: 12, tipo: 'manual', origen: 'Registro individual', sector: 'Software y Servicios', periodo: 'Semestre 2 - 2025', registros: 1, fecha: '2026-04-21', estado: 'No verificado' },
];

const TARJETAS = [
  { label: 'Total empresas', valor: '156', Icono: Landmark, estilo: 'bg-[#fbe9f0] text-[#a00046]' },
  { label: 'Registros totales', valor: '1,248', Icono: Database, estilo: 'bg-[#eaf6ef] text-[#2f9e58]' },
  { label: 'Archivos cargados', valor: '32', Icono: FileText, estilo: 'bg-[#e8f1fb] text-[#2f6fb0]' },
  { label: 'Carga manual', valor: '422', Icono: PenLine, estilo: 'bg-[#f3ecfb] text-[#7c4dbd]' },
];

function formatearFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function HistorialSpePage() {
  const [tab, setTab] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortDir, setSortDir] = useState('desc');

  const registros = REGISTROS_INICIALES;

  // Filtrado, orden y paginación locales (solo visual).
  const filtrados = useMemo(() => {
    const tipoActual = TABS.find((t) => t.id === tab)?.tipo;
    const texto = busqueda.trim().toLowerCase();
    const lista = registros.filter((r) => {
      if (tipoActual && r.tipo !== tipoActual) return false;
      if (periodo && r.periodo !== periodo) return false;
      if (estado === 'verificado' && r.estado !== 'Verificado') return false;
      if (estado === 'no_verificado' && r.estado !== 'No verificado') return false;
      if (texto && !`${r.sector} ${r.origen}`.toLowerCase().includes(texto)) return false;
      return true;
    });
    return [...lista].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      const cmp = String(va).localeCompare(String(vb), 'es');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [registros, tab, periodo, estado, busqueda, sortBy, sortDir]);

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function cambiarTab(idTab) {
    setTab(idTab);
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
    if (sortBy !== columna) return <ChevronsUpDown size={11} className="text-[#c3c9c7]" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        {/* Breadcrumb */}
        <Link
          to="/spe"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"
        >
          <ArrowLeft size={13} /> Volver al Dashboard SPE
        </Link>

        {/* Encabezado */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">
            Historial de registros — Sector Privado Exportador
          </h1>
          <p className="mt-1 text-sm text-[#6d7673]">
            Todos los registros ingresados manualmente o cargados por archivo para el Sector Privado Exportador.
          </p>
        </div>

        {/* Barra de tabs, filtros, búsqueda y acción */}
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
                value={periodo}
                onChange={(e) => {
                  setPeriodo(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
              >
                <option value="">Todo el periodo</option>
                {PERIODOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <div className="relative">
              <select
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  setPage(1);
                }}
                className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
              >
                <option value="">Filtrar por Estado</option>
                <option value="verificado">Verificado</option>
                <option value="no_verificado">No verificado</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por archivo o sector..."
                className="w-64 rounded-lg border border-[#dfe4e5] bg-white py-2 pl-8 pr-3 text-xs text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
          </div>

          <Link
            to="/spe/registrar"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039]"
          >
            <Plus size={14} /> Nuevo Registro
          </Link>
        </section>

        {/* Tabla */}
        <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                <tr>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('sector')} className="inline-flex items-center gap-1 hover:text-[#a00046]">
                      {COLUMNAS_ORDENABLES.sector} <IconoOrden columna="sector" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('periodo')} className="inline-flex items-center gap-1 hover:text-[#a00046]">
                      {COLUMNAS_ORDENABLES.periodo} <IconoOrden columna="periodo" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Registros</th>
                  <th className="px-4 py-3">
                    <button onClick={() => alternarOrden('fecha')} className="inline-flex items-center gap-1 hover:text-[#a00046]">
                      {COLUMNAS_ORDENABLES.fecha} <IconoOrden columna="fecha" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#8a9290]">
                      No hay registros que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  visibles.map((r) => (
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
                      <td className="px-4 py-3">{r.sector}</td>
                      <td className="px-4 py-3">{r.periodo}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f1f3f3] px-2 py-1 text-[10px] font-bold text-[#414845]">
                          {r.registros}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatearFecha(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${r.estado === 'Verificado' ? 'bg-[#eaf6ef] text-[#2f9e58]' : 'bg-[#fbf1de] text-[#b7891e]'
                            }`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3 text-[#8a9290]">
                          <button type="button" className="hover:text-[#a00046]"><Eye size={14} /></button>
                          <button type="button" className="hover:text-[#a00046]">
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
              Mostrando {visibles.length} de {total} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={paginaActual <= 1}
                onClick={() => setPage(paginaActual - 1)}
                className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="rotate-90" />
              </button>
              <span className="px-2 font-semibold text-[#59615e]">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPage(paginaActual + 1)}
                className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50"
              >
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
          </div>
        </section>

        {/* Tarjetas de resumen (en lugar de la ayuda de carga masiva) */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TARJETAS.map(({ label, valor, Icono, estilo }) => (
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