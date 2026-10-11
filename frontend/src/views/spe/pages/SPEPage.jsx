import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLES } from '../../../shared/AuthContext';
import RoleGate from '../../../shared/RoleGate';
import CitaAcademica from '../../../shared/CitaAcademica';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  History,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import FiltrosSpe from '../components/FiltrosSpe';
import InsightsSpe from '../components/InsightsSpe';
import ExportarSpe from '../components/ExportarSpe';

const COLORES = ['#961d4b', 'var(--color-line)'];
const TOOLTIP = {
  contentStyle: { border: 0, borderRadius: 10, boxShadow: '0 8px 24px rgba(31, 34, 32, .12)', backgroundColor: 'var(--color-card)', color: 'var(--color-ink)' },
  labelStyle: { color: 'var(--color-ink)' },
};

function prepararExpectativas(expectativas = {}) {
  const categorias = expectativas.pib?.map((item) => item.categoria) || [];
  return categorias.map((categoria) => ({
    categoria,
    pib: expectativas.pib?.find((item) => item.categoria === categoria)?.cantidad || 0,
    inflacion: expectativas.inflacion?.find((item) => item.categoria === categoria)?.cantidad || 0,
    tipoCambio: expectativas.tipoCambio?.find((item) => item.categoria === categoria)?.cantidad || 0,
  }));
}
// El período puede venir con año y semestre, solo año, solo semestre, o vacío.
function etiquetaPeriodo({ year, semester } = {}) {
  if (year && semester) return `Sem ${semester} · ${year}`;
  if (year) return `Año ${year}`;
  if (semester) return `Semestre ${semester}`;
  return 'Sin datos';
}

export default function SPEPage() {
  const [filtros, setFiltros] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [errorDashboard, setErrorDashboard] = useState('');
  const datos = dashboard ? {
    ...dashboard,
    indices: dashboard.indices || {},
    indicesAnterior: dashboard.indicesAnterior || {},
    periodo: dashboard.periodo || {},
    expectativas: prepararExpectativas(dashboard.secciones?.expectativas),
    barreras: dashboard.secciones?.comercio?.barreraPrincipal || [],
    propension: dashboard.secciones?.inversion?.propension || [],
  } : {
    totalEmpresas: 0,
    indices: {},
    indicesAnterior: {},
    periodo: {},
    expectativas: [],
    barreras: [],
    propension: [],
    opcionesFiltros: undefined,
  };
  const propensionSi = datos.propension.find((item) => item.name === 'Sí')?.value || 0;
  const variacion = (actual, anterior) => (Number.isFinite(actual) && Number.isFinite(anterior) ? `${actual - anterior >= 0 ? '+' : ''}${(actual - anterior).toFixed(1)} pts` : 'Sin comparación');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(Object.entries(filtros).filter(([, value]) => value));

    async function cargarDashboard() {
      try {
        const response = await fetch(`/api/spe${params.toString() ? `?${params}` : ''}`, { signal: controller.signal });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.error || 'No se pudo cargar el dashboard SPE');
        setDashboard(resultado);
        setErrorDashboard('');
      } catch (error) {
        if (error.name !== 'AbortError') setErrorDashboard(error.message);
      }
    }

    cargarDashboard();
    return () => controller.abort();
  }, [filtros]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand"><span className="h-1.5 w-1.5 rounded-full bg-maroon" /> Módulo sector privado exportador</div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[30px]">Sector Privado Exportador</h1>
            <p className="mt-1 text-sm text-ink/60">Encuesta semestral SOCOMEX–SOCIFIN a empresas exportadoras bolivianas</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[11px] font-semibold text-ink-2"><FileCheck2 size={14} className="text-[#3d916b]" /> Datos aprobados</span>
            <RoleGate allow={[ROLES.SUPERADMIN]}>
              <Link to="/spe/historial" className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-2 shadow-sm transition hover:border-brand hover:text-brand"><History size={14} /> Historial de registros</Link>
              <Link to="/spe/registrar" className="inline-flex items-center gap-2 rounded-lg bg-maroon px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-maroon-dark"><Plus size={14} /> Registrar registro</Link>
            </RoleGate>
          </div>
        </div>
<ExportarSpe filtros={filtros} />
        <FiltrosSpe filtros={filtros} onAplicar={setFiltros} opciones={datos?.opcionesFiltros} />

        {errorDashboard && <p className="rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-xs text-brand">{errorDashboard}</p>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Empresas encuestadas" value={datos.totalEmpresas} detail="Respuestas aprobadas" icon={<Users size={19} />} />
          <StatCard label="ICE promedio" value={Number.isFinite(datos.indices.ice) ? `${datos.indices.ice} pts` : "-"} detail="Índice de competitividad exportadora" icon={<Gauge size={19} />} variation={variacion(datos.indices.ice, datos.indicesAnterior.ice)} />
          <StatCard label="Propensión a invertir" value={`${propensionSi}% Sí`} detail="En los próximos 12 meses" icon={<TrendingUp size={19} />} />
          <StatCard label="Período actual" value={etiquetaPeriodo(datos.periodo)} detail="Última medición disponible" icon={<Building2 size={19} />} />
          </div>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
          <Panel title="Propensión a invertir en 12 meses" icon={<CircleDollarSign size={16} />}>
            <div className="relative h-[215px]">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={datos.propension} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={0} startAngle={90} endAngle={-270} stroke="none">{datos.propension.map((entry, index) => <Cell key={entry.name} fill={COLORES[index]} />)}</Pie><Tooltip {...TOOLTIP} formatter={(value) => [`${value}%`, 'Respuestas']} /></PieChart></ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl text-ink">{propensionSi}%</strong><span className="text-[10px] text-muted">invertirá</span></div>
            </div>
            <div className="flex justify-center gap-5 text-[10px] text-muted"><span><i className="mr-1 inline-block h-2 w-2 bg-maroon" /> Sí</span><span><i className="mr-1 inline-block h-2 w-2 bg-subtle" /> No</span></div>
          </Panel>
          <Panel title="Expectativas macroeconómicas" icon={<ChartNoAxesCombined size={16} />}>
            <div className="h-[245px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={datos.expectativas} layout="vertical" margin={{ top: 4, right: 8, left: 100, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--color-line)" /><XAxis type="number" hide /><YAxis type="category" dataKey="categoria" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} width={96} /><Tooltip {...TOOLTIP} formatter={(value) => [`${value} empresas`, 'Respuestas']} /><Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} /><Bar dataKey="pib" name="Crecimiento del PIB" fill="#961d4b" barSize={12} radius={[0, 2, 2, 0]} /><Bar dataKey="inflacion" name="Inflación" fill="#b54363" barSize={12} radius={[0, 2, 2, 0]} /><Bar dataKey="tipoCambio" name="Tipo de cambio" fill="#d17b91" barSize={12} radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer></div>
          </Panel>
        </section>

        <Panel title="Principales barreras al comercio exterior (Empresas)" icon={<BarChart3 size={16} />}>
          <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={datos.barreras} layout="vertical" margin={{ top: 4, right: 16, left: 135, bottom: 4 }}><CartesianGrid vertical={true} horizontal={false} stroke="var(--color-line)" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="barrera" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} width={130} /><Tooltip {...TOOLTIP} formatter={(value) => [`${value}%`, 'Empresas']} /><Bar dataKey="porcentaje" name="Empresas" fill="#961d4b" barSize={22} radius={[0, 2, 2, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <IndexCard label="IEE" name="Expectativas empresariales exportadoras" value={datos.indices.iee} previous={datos.indicesAnterior.iee} />
          <IndexCard label="ICE" name="Competitividad exportadora" value={datos.indices.ice} previous={datos.indicesAnterior.ice} active />
          <IndexCard label="IIE" name="Internacionalización empresarial" value={datos.indices.iie} previous={datos.indicesAnterior.iie} />
          <IndexCard label="ICIE" name="Clima para la inversión exportadora" value={datos.indices.icie} previous={datos.indicesAnterior.icie} />
        </section>
        <InsightsSpe insights={datos?.insights ?? []} />
        <CitaAcademica recurso="spe" />
      </div>
    </main>
  );
}

function StatCard({ label, value, detail, icon, variation }) {
  return <article className="rounded-xl border border-line bg-card p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-2 text-xl font-bold text-ink">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span></div><div className="mt-3 flex items-center justify-between text-[10px] text-muted"><span>{detail}</span>{variation && <span className="font-bold text-[#3d916b]">{variation}</span>}</div></article>;
}

function Panel({ title, icon, children }) {
  return <article className="rounded-xl border border-line bg-card p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><span className="text-brand">{icon}</span><h2 className="text-sm font-bold text-ink">{title}</h2></div>{children}</article>;
}

function IndexCard({ label, name, value, previous, active }) {
  const change = Number.isFinite(value) && Number.isFinite(previous) ? value - previous : null;
  return <article className={`rounded-xl border p-4 shadow-sm ${active ? 'border-brand bg-brand-soft' : 'border-line bg-card'}`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-brand">{label}</span><span className="text-[10px] text-muted">vs. anterior</span></div><p className="mt-3 text-2xl font-bold text-ink">{value ?? '-'}<span className="ml-1 text-xs font-normal text-muted">pts</span></p><p className="mt-1 text-[10px] text-muted">{name}</p><p className={`mt-3 flex items-center gap-1 text-[10px] font-bold ${change === null ? 'text-muted' : change >= 0 ? 'text-[#3d916b]' : 'text-brand'}`}>{change === null ? 'Sin comparación' : <>{change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change >= 0 ? '+' : ''}{change.toFixed(1)} pts</>}</p></article>;
}
