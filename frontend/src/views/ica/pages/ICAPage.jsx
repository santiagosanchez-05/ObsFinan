import { useState } from 'react';
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

const comunaData = [
  { nombre: 'Adela Zamudio', valor: 67.5 },
  { nombre: 'Itocta', valor: 62.4 },
  { nombre: 'Molle', valor: 62.6 },
  { nombre: 'Tupuraya', valor: 60.0 },
  { nombre: 'Valle Hermoso', valor: 61.8 },
  { nombre: 'Alejo C.', valor: 61.8 },
];

const dimensiones = [
  { dimension: 'Conocimiento', valor: 72.4 },
  { dimension: 'Uso', valor: 78.2 },
  { dimension: 'Educación', valor: 53.7 },
  { dimension: 'Previsión', valor: 60.5 },
];

const brechaData = [
  { nombre: 'Adela Z.', hombres: 69.2, mujeres: 65.8 },
  { nombre: 'Itocta', hombres: 63.1, mujeres: 61.7 },
  { nombre: 'Molle', hombres: 64.0, mujeres: 61.2 },
  { nombre: 'Tupuraya', hombres: 61.2, mujeres: 58.8 },
  { nombre: 'Valle H.', hombres: 65.3, mujeres: 58.3 },
  { nombre: 'Alejo C.', hombres: 62.1, mujeres: 61.5 },
];

const detalleData = [
  ['Adela Zamudio', '72.4', '78.2', '58.9', '60.5', '69.2', '65.8', '67.5'],
  ['Itocta', '64.5', '71.8', '54.2', '59.1', '63.1', '61.7', '62.4'],
  ['Molle', '66.1', '73.5', '51.9', '58.9', '64.0', '61.2', '62.6'],
  ['Tupuraya', '59.8', '68.2', '48.5', '63.5', '61.2', '58.8', '60.0'],
  ['Valle Hermoso', '63.2', '74.1', '50.8', '59.1', '65.3', '58.3', '61.8'],
  ['Alejo C. (T.)', '65.2', '75.8', '49.9', '56.3', '62.1', '61.5', '61.8'],
];

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

  async function handleConfirmarUpload() {
    if (!archivo || !quarter) {
      setEstado({ cargando: false, resultado: null, error: 'Completá trimestre y archivo.' });
      return;
    }
    setEstado({ cargando: true, resultado: null, error: null });

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('quarter', quarter);
    formData.append('year', year);

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
    } catch {
      setEstado({ cargando: false, resultado: null, error: 'Error de conexión con el servidor' });
    }
  }

  function handleCancelar() {
    setMostrarUpload(false);
    setArchivo(null);
    setEstado({ cargando: false, resultado: null, error: null });
  }
  return (
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
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#a00046] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#820039]"><Plus size={14} /> Registrar registro</button>
          </div>
        </div>

        <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777f7c]"><Filter size={14} className="text-[#a00046]" /> Filtros de consulta</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <FilterSelect label="Período" value="2026 - Semestre 1" />
            <FilterSelect label="Comuna" value="Todas" />
            <FilterSelect label="Dimensión" value="Todas" />
            <button className="rounded-lg bg-[#252927] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a00046]">Aplicar filtros</button>
          </div>
        </section>
        {mostrarUpload && (
          <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#252927]">Subir dataset ICA</h2>
              <button onClick={handleCancelar} className="text-[#8a9290] hover:text-[#a00046]"><X size={16} /></button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Sede</span>
                <p className="rounded-lg border border-[#dfe4e5] bg-[#f4f6f8] px-3 py-2 text-xs text-[#414845]">
                  {user?.campusName ?? 'Cochabamba'}
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Trimestre</span>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="w-full rounded-lg border border-[#dfe4e5] px-3 py-2 text-xs">
                  <option value="">Selecciona</option>
                  {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-3">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivo(e.target.files[0] || null)} className="block w-full text-xs" />
              <p className="mt-1 text-[10px] text-[#8a9290]">Formato esperado: Comuna, Conocimiento, Uso, Educación, Previsión, ICA Hombres, ICA Mujeres.</p>
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
          <MetricCard label="ICA general" value="62.8" detail="Puntaje ponderado nacional" trend="+2.4%" icon={<BarChart3 size={22} />} />
          <MetricCard label="Mejor comuna" value="Adela Zamudio" detail="ICA promedio" accent="67.5 pts" icon={<Medal size={22} />} />
          <MetricCard label="Dimensión crítica" value="Educación" detail="Requiere intervención inmediata" accent="53.7 pts" icon={<AlertTriangle size={22} />} warning />
          <MetricCard label="Brecha de género" value="7.0" detail="Pico en Valle Hermoso" accent="pts" icon={<Users size={22} />} />
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-3">
          <ChartPanel title="ICA por comuna">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={comunaData} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f1" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 80]} tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'ICA']} /><Bar dataKey="valor" radius={[2, 2, 0, 0]}>{comunaData.map((entry) => <Cell key={entry.nombre} fill={entry.valor === 67.5 ? '#a00046' : '#b65a78'} />)}</Bar></BarChart></ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="Dimensiones (promedio)">
            <ResponsiveContainer width="100%" height="100%"><RadarChart data={dimensiones} outerRadius="68%"><PolarGrid stroke="#cfd5d4" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#59615e' }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: '#8a9290' }} /><Radar name="Promedio" dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.18} strokeWidth={2} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'Promedio']} /></RadarChart></ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="Brecha de género">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={brechaData} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f1" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 80]} tick={{ fontSize: 9, fill: '#69716e' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`]} /><Bar dataKey="hombres" fill="#222725" radius={[2, 2, 0, 0]} /><Bar dataKey="mujeres" fill="#a00046" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
            <div className="mt-1 flex justify-center gap-4 text-[10px] text-[#737b78]"><span><i className="mr-1 inline-block h-2 w-2 bg-[#222725]" /> Hombres</span><span><i className="mr-1 inline-block h-2 w-2 bg-[#a00046]" /> Mujeres</span></div>
          </ChartPanel>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold text-[#252927]">Hallazgos clave</h2>
          <div className="grid gap-3 lg:grid-cols-4">
            <Finding tone="red" icon={<ArrowDownRight size={14} />} text="Tupuraya tiene el ICA más bajo del grupo, impulsado principalmente por su débil desempeño en Educación (48.5 pts)." />
            <Finding tone="gold" icon={<ArrowUpRight size={14} />} text="Valle Hermoso presenta la mayor brecha: los hombres puntúan 7.0 puntos por encima de las mujeres (65.3 vs 58.3)." />
            <Finding tone="gray" icon={<Info size={14} />} text="Educación es la dimensión más débil en todas las comunas (53.7), mientras que Uso es la más fuerte (75.6)." />
            <Finding tone="green" icon={<ArrowUpRight size={14} />} text="Adela Zamudio lidera el índice general con 67.5 pts, destacando en las dimensiones de Conocimiento y Uso." />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[#edf0f1] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-[#252927]">Desglose detallado por comuna</h2><p className="mt-1 text-xs text-[#8a9290]">Resultados del período seleccionado</p></div><button className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#a00046] hover:underline"><Download size={13} /> Exportar CSV</button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]"><tr>{['Comuna', 'Conocimiento', 'Uso', 'Educación', 'Previsión', 'ICA hombres', 'ICA mujeres', 'Índice general'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{detalleData.map((row, index) => <tr key={row[0]} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]">{row.map((value, cellIndex) => <td key={`${row[0]}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 0 ? 'font-semibold text-[#252927]' : ''} ${cellIndex === 3 ? 'font-semibold text-[#a00046]' : ''} ${cellIndex === 7 ? 'font-bold' : ''}`}>{cellIndex === 7 ? <span className={`rounded-full px-2 py-1 text-[10px] ${index === 0 ? 'bg-[#f9e5ed] text-[#a00046]' : 'bg-[#f1f3f3] text-[#414845]'}`}>{value}</span> : value}</td>)}</tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290]"><span>Mostrando 6 de 6 comunas registradas</span><div className="flex gap-2"><button disabled className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50">Anterior</button><button className="rounded border border-[#e4e8e8] px-2 py-1 hover:border-[#a00046]">Siguiente</button></div></div>
        </section>
      </div>
    </main>
  );
}

function FilterSelect({ label, value }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</span><select defaultValue={value} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]"><option>{value}</option><option>Todas</option><option>2025 - Semestre 2</option></select></label>;
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
