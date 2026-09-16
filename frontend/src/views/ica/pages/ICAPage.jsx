import { useEffect, useState } from 'react';
import { useAuth, ROLES } from '../../../shared/AuthContext';
import RoleGate from '../../../shared/RoleGate';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  Filter,
  History,
  Info,
  Medal,
  Plus,
  Users, Upload, X, Loader2, CheckCircle2, AlertCircle

} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartTooltip = {
  contentStyle: { border: '0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(31, 34, 32, .12)' },
};

export default function ICAPage() {
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [quarter, setQuarter] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [estado, setEstado] = useState({ cargando: false, resultado: null, error: null });
  const { user, token } = useAuth();
  const [mostrarExito, setMostrarExito] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [errorDashboard, setErrorDashboard] = useState('');
  const [filtros, setFiltros] = useState({ year: '', quarter: '', communityId: '' });
  const [filtrosAplicados, setFiltrosAplicados] = useState({});

  useEffect(() => {
    let cancelado = false;

    async function cargarDashboard() {
      try {
        const params = new URLSearchParams(
          Object.entries(filtrosAplicados).filter(([, value]) => value !== '' && value !== null),
        );
        const res = await fetch(`/api/ica${params.toString() ? `?${params}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el dashboard ICA');
        if (!cancelado) {
          setDashboard(data);
          setErrorDashboard('');
        }
      } catch (err) {
        if (!cancelado) setErrorDashboard(err.message);
      }
    }

    cargarDashboard();
    return () => {
      cancelado = true;
    };
  }, [token, filtrosAplicados]);

  const periodo = dashboard?.periodo;
  const periodoLabel = periodo ? `${periodo.year} - Trimestre ${periodo.quarter}` : 'Cargando...';
  const comunas = dashboard?.comunas ?? [];
  const dimensiones = dashboard?.dimensiones ?? [];
  const brechas = dashboard?.brechas ?? [];
  const metricas = dashboard?.metricas;
  const comunaMinima = comunas.reduce((minima, comuna) => (!minima || comuna.valor < minima.valor ? comuna : minima), null);

  async function handleConfirmarUpload() {
    if (!archivo || !quarter || !year) {
      setEstado({ cargando: false, resultado: null, error: 'Completa año, trimestre y archivo.' });
      return;
    }

    const yearNumber = Number(year);

    if (!Number.isInteger(yearNumber) || yearNumber < 2019 || yearNumber > new Date().getFullYear()) {
      setEstado({
        cargando: false,
        resultado: null,
        error: `El año debe estar entre 2019 y ${new Date().getFullYear()}.`
      });
      return;
    }
    setEstado({ cargando: true, resultado: null, error: null });

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('quarter', quarter);
    formData.append('year', yearNumber);

    try {
      const res = await fetch('/api/ica/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setEstado({ cargando: false, resultado: null, error: data.error || 'No se pudo subir el archivo' });
        return;
      }
      setEstado({ cargando: false, resultado: data, error: null });
      setMostrarExito(true);
    } catch {
      setEstado({ cargando: false, resultado: null, error: 'Error de conexión con el servidor' });
    }
  }

  function handleCancelar() {
    setMostrarUpload(false);
    setArchivo(null);
    setQuarter('');
    setYear(new Date().getFullYear());
    setMostrarExito(false);
    setEstado({ cargando: false, resultado: null, error: null });
  }
  function cerrarExito() {

    handleCancelar();
  }
  return (
    <>
      {mostrarExito && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
          onClick={cerrarExito}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf6ef] text-[#3c8d66]">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#252927]">
                  Archivo cargado correctamente
                </h2>
                <p className="mt-1 text-xs text-[#8a9290]">
                  La carga se registró correctamente.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-[#f4f6f8] p-3 text-xs text-[#59615e]">
              <p>
                <span className="font-semibold">Archivo:</span> {archivo?.name}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Registros cargados:</span>{' '}
                {estado.resultado?.filasInsertadas}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Año:</span> {year}
                {' · '}
                <span className="font-semibold">Trimestre:</span> Q{quarter}
              </p>
            </div>

            {estado.resultado?.filasConError?.length > 0 && (
              <p className="mt-3 flex items-center gap-1 text-xs text-[#b77d18]">
                <AlertCircle size={13} />
                {estado.resultado.filasConError.length} filas con error.
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={cerrarExito}
                className="rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white hover:bg-[#820039]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a00046]">Módulo ICA</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Índice de Ahorro Comunitario</h1>
              <p className="mt-1 text-sm text-[#6d7673]">Encuesta trimestral aplicada en comunas de las sedes de Univalle</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                <Link
                  to="/ica/historial"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#dce1e4] bg-white px-3 py-2 text-xs font-semibold text-[#59615e] shadow-sm transition hover:border-[#a00046] hover:text-[#a00046]"
                >
                  <History size={14} /> Historial de registros
                </Link>
              </RoleGate>
              <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                <button
                  onClick={() => setMostrarUpload((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#d6a4b7] bg-white px-3 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fff3f7]"
                >
                  <Upload size={14} /> Subir dataset
                </button>
              </RoleGate>
              <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                <Link
                  to="/ica/registrar"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#a00046] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039]"
                >
                  <Plus size={14} /> Registrar registro
                </Link>
              </RoleGate>
            </div>
          </div>

          {errorDashboard && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorDashboard}</p>}
          <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777f7c]"><Filter size={14} className="text-[#a00046]" /> Filtros de consulta</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Período</span><select value={filtros.year && filtros.quarter ? `${filtros.year}-${filtros.quarter}` : ''} onChange={(event) => { const [yearValue, quarterValue] = event.target.value.split('-'); setFiltros((actual) => ({ ...actual, year: yearValue || '', quarter: quarterValue || '' })); }} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Más reciente</option>{periodo && <option value={`${periodo.year}-${periodo.quarter}`}>{periodoLabel}</option>}</select></label>
              <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Comuna</span><select value={filtros.communityId} onChange={(event) => setFiltros((actual) => ({ ...actual, communityId: event.target.value }))} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Todas</option>{comunas.map((comuna) => <option key={comuna.communityId} value={comuna.communityId}>{comuna.nombre}</option>)}</select></label>
              <FilterSelect label="Dimensión" value="Todas" />
              <button onClick={() => setFiltrosAplicados(filtros)} className="rounded-lg bg-[#252927] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a00046]">Aplicar filtros</button>
            </div>
          </section>
          {mostrarUpload && (
            <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#252927]">Subir dataset ICA</h2>
                <button onClick={handleCancelar} className="text-[#8a9290] hover:text-[#a00046]"><X size={16} /></button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Sede</span>
                  <p className="rounded-lg border border-[#dfe4e5] bg-[#f4f6f8] px-3 py-2 text-xs text-[#414845]">
                    {user?.campusName ?? 'Cochabamba'}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Año</span>
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-lg border border-[#dfe4e5] px-3 py-2 text-xs"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Trimestre</span>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="w-full rounded-lg border border-[#dfe4e5] px-3 py-2 text-xs"
                  >
                    <option value="">Selecciona</option>
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>Q{q}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <div className="mt-3">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
                      Archivo Excel
                    </span>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d6a4b7] bg-white px-3 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fff3f7]">
                        <Upload size={14} />
                        Seleccionar archivo
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => setArchivo(e.target.files[0] || null)}
                          className="hidden"
                        />
                      </label>

                      {archivo && (
                        <span className="text-xs text-[#59615e]">
                          {archivo.name}
                        </span>
                      )}
                    </div>
                  </label>


                </div>
                <p className="mt-1 text-[10px] text-[#8a9290]">
                  Excel (.xlsx/.xls) · Columnas: Comuna, Conocimiento, Uso, Educación, Previsión, ICA Hombres, ICA Mujeres.
                </p>
              </div>

              {estado.error && <p className="mt-2 flex items-center gap-1 text-xs text-[#a00046]"><AlertCircle size={13} /> {estado.error}</p>}
              {estado.resultado && (
                <p className="mt-2 flex items-center gap-1 text-xs text-[#3c8d66]">
                  <CheckCircle2 size={13} /> {estado.resultado.filasInsertadas} filas cargadas correctamente.
                  {estado.resultado.filasConError?.length > 0 && ` ${estado.resultado.filasConError.length} filas con error, revisá el detalle.`}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={handleCancelar} className="rounded-lg border border-[#dce1e4] px-4 py-2 text-xs font-semibold text-[#59615e]">Cancelar</button>
                <button
                  onClick={handleConfirmarUpload}
                  disabled={estado.cargando}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white hover:bg-[#820039] disabled:opacity-50"
                >
                  {estado.cargando ? <Loader2 size={13} className="animate-spin" /> : null} Confirmar
                </button>
              </div>
            </section>
          )}
          <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="ICA general" value={metricas ? metricas.general : '-'} detail="Puntaje promedio del período" icon={<BarChart3 size={22} />} />
            <MetricCard label="Mejor comuna" value={metricas?.mejorComuna?.nombre ?? '-'} detail="ICA promedio" accent={metricas ? `${metricas.mejorComuna.valor} pts` : ''} icon={<Medal size={22} />} />
            <MetricCard label="Dimensión crítica" value={metricas?.dimensionCritica?.dimension ?? '-'} detail="Menor promedio del período" accent={metricas ? `${metricas.dimensionCritica.valor} pts` : ''} icon={<AlertTriangle size={22} />} warning />
            <MetricCard label="Brecha de género" value={metricas?.brechaGenero?.valor ?? '-'} detail={metricas?.brechaGenero?.nombre ?? 'Sin datos'} accent="pts" icon={<Users size={22} />} />
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-3">
            <ChartPanel title="ICA por comuna">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={comunas} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f1" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'ICA']} /><Bar dataKey="valor" radius={[2, 2, 0, 0]}>{comunas.map((entry) => <Cell key={entry.nombre} fill={entry.nombre === metricas?.mejorComuna?.nombre ? '#a00046' : '#b65a78'} />)}</Bar></BarChart></ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Dimensiones (promedio)">
              <ResponsiveContainer width="100%" height="100%"><RadarChart data={dimensiones} outerRadius="68%"><PolarGrid stroke="#cfd5d4" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#59615e' }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: '#8a9290' }} /><Radar name="Promedio" dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.18} strokeWidth={2} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'Promedio']} /></RadarChart></ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="Brecha de género">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={brechas} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f1" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`]} /><Bar dataKey="hombres" fill="#222725" radius={[2, 2, 0, 0]} /><Bar dataKey="mujeres" fill="#a00046" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
              <div className="mt-1 flex justify-center gap-4 text-[10px] text-[#737b78]"><span><i className="mr-1 inline-block h-2 w-2 bg-[#222725]" /> Hombres</span><span><i className="mr-1 inline-block h-2 w-2 bg-[#a00046]" /> Mujeres</span></div>
            </ChartPanel>
          </section>

          <section className="mb-5">
            <h2 className="mb-3 text-sm font-bold text-[#252927]">Hallazgos clave</h2>
            <div className="grid gap-3 lg:grid-cols-4">
              {metricas && <>
                <Finding tone="red" icon={<ArrowDownRight size={14} />} text={`${comunaMinima?.nombre ?? 'Sin comuna'} tiene el ICA más bajo del período con ${comunaMinima?.valor ?? '-'} pts.`} />
                <Finding tone="gold" icon={<ArrowUpRight size={14} />} text={`${metricas.brechaGenero.nombre} presenta la mayor brecha: ${metricas.brechaGenero.valor} puntos entre hombres y mujeres.`} />
                <Finding tone="gray" icon={<Info size={14} />} text={`${metricas.dimensionCritica.dimension} es la dimensión más débil con ${metricas.dimensionCritica.valor} pts promedio.`} />
                <Finding tone="green" icon={<ArrowUpRight size={14} />} text={`${metricas.mejorComuna.nombre} lidera el índice general con ${metricas.mejorComuna.valor} pts.`} />
              </>}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#edf0f1] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-[#252927]">Desglose detallado por comuna</h2><p className="mt-1 text-xs text-[#8a9290]">Resultados del período seleccionado</p></div><button className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#a00046] hover:underline"><Download size={13} /> Exportar CSV</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]"><tr>{['Comuna', 'Conocimiento', 'Uso', 'Educación', 'Previsión', 'ICA hombres', 'ICA mujeres', 'Índice general'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{comunas.map((row, index) => <tr key={row.id} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]"><td className="px-4 py-3 font-semibold text-[#252927]">{row.nombre}</td>{[row.conocimiento, row.uso, row.educacion, row.prevision, row.hombres, row.mujeres].map((value, cellIndex) => <td key={`${row.id}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 2 ? 'font-semibold text-[#a00046]' : ''}`}>{value}</td>)}<td className="px-4 py-3 font-bold"><span className={`rounded-full px-2 py-1 text-[10px] ${index === 0 ? 'bg-[#f9e5ed] text-[#a00046]' : 'bg-[#f1f3f3] text-[#414845]'}`}>{row.valor}</span></td></tr>)}</tbody></table></div>
            <div className="flex items-center justify-between border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290]"><span>Mostrando {comunas.length} comunas registradas</span><div className="flex gap-2"><button disabled className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50">Anterior</button><button className="rounded border border-[#e4e8e8] px-2 py-1 hover:border-[#a00046]">Siguiente</button></div></div>
          </section>
        </div>
      </main>
    </>
  );
}

function FilterSelect({ label, value }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</span><select value={value} disabled className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]"><option>{value}</option></select></label>;
}

function MetricCard({ label, value, detail, trend, accent, icon, warning }) {
  return <article className="flex min-h-[118px] items-start justify-between rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p><p className={`mt-2 text-xl font-bold leading-none ${warning ? 'text-[#a00046]' : 'text-[#252927]'}`}>{value} {accent && <span className="text-sm">{accent}</span>}</p><p className="mt-3 text-[10px] text-[#8a9290]">{detail}</p>{trend && <span className="mt-2 inline-flex text-[10px] font-bold text-[#3c8d66]">{trend}</span>}</div><span className={`rounded-lg p-2 ${warning ? 'bg-[#faeef2] text-[#a00046]' : 'bg-[#f5f7f7] text-[#b65a78]'}`}>{icon}</span></article>;
}

function ChartPanel({ title, children }) {
  return <article className="min-h-[285px] rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm"><h2 className="mb-2 text-xs font-bold text-[#252927]">{title}</h2><div className="h-[225px]">{children}</div></article>;
}

function Finding({ tone, icon, text }) {
  const tones = { red: 'border-[#a00046] text-[#a00046]', gold: 'border-[#d49b31] text-[#b77d18]', gray: 'border-[#aeb8b5] text-[#78827f]', green: 'border-[#7cbb9a] text-[#3c8d66]' };
  return <div className={`rounded-lg border-l-2 bg-white px-3 py-3 text-[10px] leading-relaxed text-[#59615e] shadow-sm ${tones[tone]}`}><span className="mr-1 inline-flex align-middle">{icon}</span>{text}</div>;
}
