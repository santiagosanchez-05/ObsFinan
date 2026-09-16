import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'individuales', label: 'Registros individuales' },
  { id: 'archivos', label: 'Archivos' },
];

export default function ICAHistory() {
  const [tab, setTab] = useState('todos');
  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    async function cargarHistorial() {
      try {
        const res = await fetch('/api/ica/historial', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial ICA');
        setRegistros(data.registros ?? []);
      } catch (err) {
        setError(err.message);
      }
    }
    cargarHistorial();
  }, [token]);

  const filas =
    tab === 'todos'
      ? registros
      : tab === 'individuales'
        ? registros.filter((r) => r.tipo === 'manual')
          : registros.filter((r) => r.tipo === 'masiva');
        const filasVisibles = filas.filter((r) => `${r.origen} ${r.comuna ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()));

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
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                    tab === t.id
                      ? 'bg-white text-[#202522] shadow-sm'
                      : 'text-[#8a9290] hover:text-[#59615e]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button className="inline-flex items-center gap-2 rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs font-semibold text-[#59615e] hover:border-[#a00046] hover:text-[#a00046]">
              Filtrar por Comuna <ChevronDown size={13} />
            </button>

            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]" />
              <input
                type="text"
                placeholder="Buscar por archivo o comuna..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-64 rounded-lg border border-[#dfe4e5] bg-white py-2 pl-8 pr-3 text-xs text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039]">
            <Plus size={14} /> Nuevo Registro
          </button>
        </section>

        {error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

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
                {filasVisibles.map((r) => (
                  <tr key={r.id} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            r.tipo === 'masiva' ? 'bg-[#e8f1fb] text-[#2f6fb0]' : 'bg-[#f3ecfb] text-[#7c4dbd]'
                          }`}
                        >
                          {r.tipo === 'masiva' ? <Folder size={14} /> : <SquarePen size={14} />}
                        </span>
                        <div>
                          <p className="font-semibold text-[#252927]">{r.origen}</p>
                          <p
                            className={`text-[9px] font-bold uppercase tracking-wider ${
                              r.tipo === 'masiva' ? 'text-[#2f6fb0]' : 'text-[#7c4dbd]'
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
                        {r.total}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.fecha}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3 text-[#8a9290]">
                        {r.tipo === 'masiva' ? (
                          <button className="hover:text-[#a00046]"><Eye size={14} /></button>
                        ) : (
                          <button className="hover:text-[#a00046]"><SquarePen size={14} /></button>
                        )}
                        <button className="hover:text-[#a00046]"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290] sm:flex-row sm:items-center sm:justify-between">
            <span>Mostrando {filasVisibles.length} registros reales</span>
            <div className="flex items-center gap-1.5">
              <button disabled className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50">
                <ChevronDown size={12} className="rotate-90" />
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={`rounded px-2.5 py-1 font-semibold ${
                    p === 1 ? 'bg-[#a00046] text-white' : 'border border-[#e4e8e8] text-[#59615e] hover:border-[#a00046]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="px-1">...</span>
              <button className="rounded border border-[#e4e8e8] px-2.5 py-1 font-semibold text-[#59615e] hover:border-[#a00046]">
                20
              </button>
              <button className="rounded border border-[#e4e8e8] px-2 py-1 hover:border-[#a00046]">
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
          <button className="shrink-0 rounded-lg border border-[#a00046] px-4 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fff3f7]">
            Ver Guía
          </button>
        </section>
      </div>
    </main>
  );
}