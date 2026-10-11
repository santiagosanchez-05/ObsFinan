import { useEffect, useState } from 'react';
import { useAuth, ROLES } from '../../../shared/AuthContext';
import RoleGate from '../../../shared/RoleGate';
import CitaAcademica from '../../../shared/CitaAcademica';
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
  Users,
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
  contentStyle: { border: '0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(31, 34, 32, .12)', backgroundColor: 'var(--color-card)', color: 'var(--color-ink)' },
  labelStyle: { color: 'var(--color-ink)' },
};

// El dashboard es público: sin sesión no se manda el header (un "Bearer null"
// lo rechazaría el backend como token inválido).
function headersDe(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ICAPage() {
  const [mostrarExportar, setMostrarExportar] = useState(false);
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [errorDashboard, setErrorDashboard] = useState('');
  const [filtros, setFiltros] = useState({ year: '', quarter: '', campusId: '', communityId: '', dimension: '', gender: '' });
  const [filtrosAplicados, setFiltrosAplicados] = useState({});
  const [vista, setVista] = useState('dashboard');
  const [preguntaSeleccionada, setPreguntaSeleccionada] = useState(null);
  const [explorador, setExplorador] = useState({ periodo: null, total: 0, preguntas: [] });
  const [errorExplorador, setErrorExplorador] = useState('');

  useEffect(() => {
    let cancelado = false;

    async function cargarDashboard() {
      try {
        const params = new URLSearchParams(
          Object.entries(filtrosAplicados).filter(([, value]) => value !== '' && value !== null),
        );
        const res = await fetch(`/api/ica${params.toString() ? `?${params}` : ''}`, { headers: headersDe(token) });
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

  useEffect(() => {
    let cancelado = false;

    async function cargarExplorador() {
      try {
        const params = new URLSearchParams(
          Object.entries(filtrosAplicados).filter(([, value]) => value !== '' && value !== null),
        );
        const res = await fetch(`/api/ica/questions${params.toString() ? `?${params}` : ''}`, { headers: headersDe(token) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el explorador de preguntas');
        if (!cancelado) {
          setExplorador(data);
          setPreguntaSeleccionada(data.preguntas?.[0] || null);
          setErrorExplorador('');
        }
      } catch (err) {
        if (!cancelado) setErrorExplorador(err.message);
      }
    }

    cargarExplorador();
    return () => { cancelado = true; };
  }, [token, filtrosAplicados]);
  const periodo = dashboard?.periodo;
  const periodoLabel = periodo ? `${periodo.year} - Trimestre ${periodo.quarter}` : 'Cargando...';
  const comunas = dashboard?.comunas ?? [];
  const dimensiones = dashboard?.dimensiones ?? [];
  const brechas = dashboard?.brechas ?? [];
  const opcionesFiltros = dashboard?.opcionesFiltros ?? {
    periodos: [],
    comunidades: [],
    dimensiones: [],
  };

  const periodosDisponibles = opcionesFiltros.periodos ?? [];
  const comunidadesDisponibles = opcionesFiltros.comunidades ?? [];
  const dimensionesDisponibles = opcionesFiltros.dimensiones ?? [];
  const generosDisponibles = opcionesFiltros.generos ?? ['hombres', 'mujeres'];
  const sedesDisponibles = opcionesFiltros.sedes ?? [];
  const metricas = dashboard?.metricas;
  const comunaMinima = comunas.reduce((minima, comuna) => (!minima || comuna.valor < minima.valor ? comuna : minima), null);

  
  
  async function handleExportarRespuestas(formato) {
    try {
      const params = new URLSearchParams({ formato });
      if (filtrosAplicados.year) params.set('year', filtrosAplicados.year);
      if (filtrosAplicados.quarter) params.set('quarter', filtrosAplicados.quarter);
      if (filtrosAplicados.communityId) params.set('communityId', filtrosAplicados.communityId);

      const res = await fetch(`/api/ica/survey-export?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo exportar las respuestas');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      const disposicion = res.headers.get('Content-Disposition') || '';
      const coincidencia = disposicion.match(/filename="(.+)"/);
      enlace.download = coincidencia ? coincidencia[1] : `respuestas_ica.${formato}`;
      enlace.href = url;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar respuestas ICA:', err);
    }
  }
  async function handleExportar(formato) {
    try {
      const params = new URLSearchParams();

      params.set('formato', formato);

      if (periodo?.year) {
        params.set('year', periodo.year);
      }

      if (periodo?.quarter) {
        params.set('quarter', periodo.quarter);
      }

      if (filtrosAplicados.communityId) {
        params.set('communityId', filtrosAplicados.communityId);
      }

      const res = await fetch(`/api/ica/export?${params.toString()}`, { headers: headersDe(token) });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo exportar el ICA');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const enlace = document.createElement('a');

      const disposicion = res.headers.get('Content-Disposition') || '';
      const coincidencia = disposicion.match(/filename="(.+)"/);

      const fechaActual = new Date().toISOString().split('T')[0];

      enlace.download = coincidencia
        ? coincidencia[1].replace(`.${formato}`, `_${fechaActual}.${formato}`)
        : `dataset_ica_${fechaActual}.${formato}`;

      enlace.href = url;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar ICA:', err);
    }
  }
  return (
    <>
      
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Módulo ICA</p>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Índice de Calidad Aseguradora</h1>
              <p className="mt-1 text-sm text-muted">Encuesta trimestral aplicada en comunas de las sedes de Univalle</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                <Link
                  to="/ica/historial"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-2 shadow-sm transition hover:border-brand hover:text-brand"
                >
                  <History size={14} /> Historial de registros
                </Link>
              </RoleGate>
             
              <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
                <Link
                  to="/ica/registrar"
                  className="inline-flex items-center gap-2 rounded-lg bg-maroon px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-maroon-dark"
                >
                  <Plus size={14} /> Registrar registro
                </Link>
              </RoleGate>
            </div>
          </div>

          <nav className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1.5 shadow-sm" aria-label="Vistas del módulo ICA">
            {[
              ['dashboard', 'Dashboard ICA'],
              ['dimensiones', 'Perfil de dimensiones'],
              ['preguntas', 'Explorador de preguntas'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setVista(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 ${vista === id ? 'bg-maroon text-white shadow-sm' : 'text-ink-2 hover:bg-brand-soft hover:text-brand'}`}>
                {label}
              </button>
            ))}
          </nav>

          {vista === 'dashboard' && <>
            {errorDashboard && <p className="mb-5 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorDashboard}</p>}
            <section className="mb-5 rounded-xl border border-line bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Filter size={14} className="text-brand" /> Filtros de consulta</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                {(!user || user.role === ROLES.SUPERADMIN) && sedesDisponibles.length > 1 && <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Sede</span><select value={filtros.campusId} onChange={(event) => setFiltros((actual) => ({ ...actual, campusId: event.target.value, communityId: '' }))} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2"><option value="">Todas</option>{sedesDisponibles.map((sede) => <option key={sede.campusId} value={sede.campusId}>{sede.nombre}</option>)}</select></label>}
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Género</span><select value={filtros.gender} onChange={(event) => setFiltros((actual) => ({ ...actual, gender: event.target.value, communityId: '' }))} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2"><option value="">Todos</option>{generosDisponibles.map((genero) => <option key={genero} value={genero}>{genero === 'hombres' ? 'Hombres' : 'Mujeres'}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Trimestre</span><select value={filtros.quarter} onChange={(event) => setFiltros((actual) => ({ ...actual, year: '', quarter: event.target.value }))} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2"><option value="">Todos</option>{[1, 2, 3, 4].map((trimestre) => <option key={trimestre} value={trimestre}>Q{trimestre}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Comuna</span><select value={filtros.communityId} onChange={(event) => setFiltros((actual) => ({ ...actual, communityId: event.target.value }))} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2"><option value="">Todas</option>{comunidadesDisponibles.map((comunidad) => (
                  <option
                    key={comunidad.communityId}
                    value={comunidad.communityId}
                  >
                    {comunidad.nombre}
                  </option>
                ))}</select></label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
                    Dimensión
                  </span>

                  <select
                    value={filtros.dimension}
                    onChange={(event) =>
                      setFiltros((actual) => ({
                        ...actual,
                        dimension: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2 outline-none focus:border-brand"
                  >
                    <option value="">Todas</option>

                    {dimensionesDisponibles.map((dimension) => (
                      <option key={dimension} value={dimension}>
                        {dimension}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => setFiltrosAplicados(filtros)} className="rounded-lg bg-night px-5 py-2 text-sm font-semibold text-white transition hover:bg-maroon">Aplicar filtros</button>
              </div>
            </section>
           
            <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="ICA general" value={metricas ? metricas.general : '-'} detail="Puntaje promedio del período" icon={<BarChart3 size={22} />} />
              <MetricCard label="Mejor comuna" value={metricas?.mejorComuna?.nombre ?? '-'} detail="ICA promedio" accent={metricas ? `${metricas.mejorComuna.valor} pts` : ''} icon={<Medal size={22} />} />
              <MetricCard label="Dimensión crítica" value={metricas?.dimensionCritica?.dimension ?? '-'} detail="Menor promedio del período" accent={metricas ? `${metricas.dimensionCritica.valor} pts` : ''} icon={<AlertTriangle size={22} />} warning />
              <MetricCard label="Brecha de género" value={metricas?.brechaGenero?.valor ?? '-'} detail={metricas?.brechaGenero?.nombre ?? 'Sin datos'} accent="pts" icon={<Users size={22} />} />
            </section>

            <section className="mb-5 grid gap-4 xl:grid-cols-3">
              <ChartPanel title="ICA por comuna">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={comunas} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--color-line)" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'ICA']} /><Bar dataKey="valor" radius={[2, 2, 0, 0]}>{comunas.map((entry) => <Cell key={entry.nombre} fill={entry.nombre === metricas?.mejorComuna?.nombre ? '#a00046' : '#b65a78'} />)}</Bar></BarChart></ResponsiveContainer>
              </ChartPanel>
              <ChartPanel title="Dimensiones (promedio)">
                <ResponsiveContainer width="100%" height="100%"><RadarChart data={dimensiones} outerRadius="68%"><PolarGrid stroke="var(--color-line)" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} /><PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--color-muted)' }} /><Radar name="Promedio" dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.18} strokeWidth={2} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'Promedio']} /></RadarChart></ResponsiveContainer>
              </ChartPanel>
              <ChartPanel title="Brecha de género">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={brechas} margin={{ top: 10, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--color-line)" /><XAxis dataKey="nombre" tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`]} /><Bar dataKey="hombres" fill="var(--color-ink)" radius={[2, 2, 0, 0]} /><Bar dataKey="mujeres" fill="#a00046" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer>
                <div className="mt-1 flex justify-center gap-4 text-[10px] text-muted"><span><i className="mr-1 inline-block h-2 w-2 bg-night" /> Hombres</span><span><i className="mr-1 inline-block h-2 w-2 bg-maroon" /> Mujeres</span></div>
              </ChartPanel>
            </section>

            <section className="mb-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Hallazgos clave</h2>
              <div className="grid gap-3 lg:grid-cols-4">
                {metricas && <>
                  <Finding tone="red" icon={<ArrowDownRight size={14} />} text={`${comunaMinima?.nombre ?? 'Sin comuna'} tiene el ICA más bajo del período con ${comunaMinima?.valor ?? '-'} pts.`} />
                  <Finding tone="gold" icon={<ArrowUpRight size={14} />} text={`${metricas.brechaGenero.nombre} presenta la mayor brecha: ${metricas.brechaGenero.valor} puntos entre hombres y mujeres.`} />
                  <Finding tone="gray" icon={<Info size={14} />} text={`${metricas.dimensionCritica.dimension} es la dimensión más débil con ${metricas.dimensionCritica.valor} pts promedio.`} />
                  <Finding tone="green" icon={<ArrowUpRight size={14} />} text={`${metricas.mejorComuna.nombre} lidera el índice general con ${metricas.mejorComuna.valor} pts.`} />
                </>}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
              <div className="flex flex-col gap-2 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-ink">Desglose detallado por comuna</h2><p className="mt-1 text-xs text-muted">Resultados del período seleccionado</p></div><div className="relative">
                <button
                  onClick={() => setMostrarExportar(!mostrarExportar)}
                  className="inline-flex items-center gap-1 self-start text-xs font-bold text-brand hover:underline"
                >
                  <Download size={13} />
                  Exportar
                </button>

                {mostrarExportar && (
                  <div className="absolute right-0 z-20 mt-2 w-32 rounded-lg border bg-card shadow-lg">
                    <button
                      onClick={() => {
                        handleExportar('csv');
                        setMostrarExportar(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-subtle"
                    >
                      CSV
                    </button>

                    <button
                      onClick={() => {
                        handleExportar('json');
                        setMostrarExportar(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-subtle"
                    >
                      JSON
                    </button>
                  </div>
                )}
              </div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-subtle text-[9px] font-bold uppercase tracking-wider text-muted"><tr>{['Comuna', 'Conocimiento', 'Uso', 'Educación', 'Previsión', 'ICA hombres', 'ICA mujeres', 'Índice general'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{comunas.map((row, index) => <tr key={row.id} className="border-t border-line text-ink-2 hover:bg-brand-soft"><td className="px-4 py-3 font-semibold text-ink">{row.nombre}</td>{[row.conocimiento, row.uso, row.educacion, row.prevision, row.hombres, row.mujeres].map((value, cellIndex) => <td key={`${row.id}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 2 ? 'font-semibold text-brand' : ''}`}>{value}</td>)}<td className="px-4 py-3 font-bold"><span className={`rounded-full px-2 py-1 text-[10px] ${index === 0 ? 'bg-brand-soft text-brand' : 'bg-subtle text-ink-2'}`}>{row.valor}</span></td></tr>)}</tbody></table></div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[10px] text-muted"><span>Mostrando {comunas.length} comunas registradas</span><div className="flex gap-2"><button disabled className="rounded border border-line px-2 py-1 disabled:opacity-50">Anterior</button><button className="rounded border border-line px-2 py-1 hover:border-brand">Siguiente</button></div></div>
            </section>
          </>}

          {vista === 'dimensiones' && <DimensionProfileView dimensiones={dimensiones} metricas={metricas} periodoLabel={periodoLabel} />}
          {vista === 'preguntas' && <QuestionExplorerView preguntas={explorador.preguntas} pregunta={preguntaSeleccionada} onSelect={setPreguntaSeleccionada} periodoLabel={explorador.periodo ? `${explorador.periodo.year} - Trimestre ${explorador.periodo.quarter}` : periodoLabel} total={explorador.total} error={errorExplorador} onExportar={handleExportarRespuestas} />}
          <CitaAcademica recurso="ica" className="mt-4" />
        </div>
      </main>
    </>
  );
}

function DimensionProfileView({ dimensiones, metricas, periodoLabel }) {
  const datos = dimensiones;

  return (
    <section className="mb-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Módulo ICA · Perfil de dimensiones</p><h2 className="text-xl font-bold text-ink">Comparativa multidimensional</h2><p className="mt-1 text-xs text-muted">Lectura del bienestar financiero por dimensión y período.</p></div>
        <span className="text-[11px] text-muted">{periodoLabel}</span>
      </div>
      {!datos.length && <p className="rounded-lg border border-line bg-card px-4 py-5 text-sm text-muted">No hay mediciones ICA para el período seleccionado.</p>}
      <div className={`grid gap-4 lg:grid-cols-[1.25fr_.75fr] ${datos.length ? '' : 'hidden'}`}>
        <ChartPanel title="Perfil del ICA">
          <ResponsiveContainer width="100%" height="100%"><RadarChart data={datos} outerRadius="68%"><PolarGrid stroke="var(--color-line)" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--color-muted)' }} /><Radar dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.2} strokeWidth={2} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'Puntaje']} /></RadarChart></ResponsiveContainer>
        </ChartPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{datos.map((item) => <MetricCard key={item.dimension} label={item.dimension} value={item.valor} detail="Puntaje promedio" accent="/100" warning={item.valor < 60} icon={<BarChart3 size={18} />} />)}</div>
      </div>
      <section className="rounded-xl border border-line bg-card p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-ink">Ranking de dimensiones</h3><p className="mt-1 text-[11px] text-muted">Ordenado por puntaje promedio actual</p></div><span className="text-[10px] text-muted">Mayor a menor</span></div><div className="space-y-3">{[...datos].sort((a, b) => b.valor - a.valor).map((item, index) => <div key={item.dimension} className="flex items-center gap-3"><span className="w-5 text-center text-[10px] font-bold text-brand">{index + 1}</span><span className="w-24 text-[11px] text-ink-2">{item.dimension}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-maroon" style={{ width: `${item.valor}%` }} /></div><span className="w-10 text-right text-[11px] font-bold text-ink">{item.valor}</span></div>)}</div></section>
      {metricas && <p className="rounded-lg border-l-2 border-brand bg-card px-3 py-3 text-[11px] text-ink-2 shadow-sm">La dimensión crítica del período es <strong className="text-brand">{metricas.dimensionCritica.dimension}</strong>, con un promedio de {metricas.dimensionCritica.valor} puntos.</p>}
    </section>
  );
}

function QuestionExplorerView({ preguntas, pregunta, onSelect, periodoLabel, total, error, onExportar }) {
  if (error) return <p className="mb-5 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>;
  if (!pregunta || !preguntas.length) return <p className="mb-5 rounded-lg border border-line bg-card px-4 py-5 text-sm text-muted">No hay respuestas de encuestas para los filtros seleccionados.</p>;

  const { id: codigo, dimension, pregunta: texto, respuestas = [], total: totalPregunta = total } = pregunta;

  return (
    <section className="mb-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Módulo ICA · Explorador</p><h2 className="text-xl font-bold text-ink">Explorador de preguntas</h2><p className="mt-1 text-xs text-muted">Seleccioná una pregunta para consultar cómo se distribuyen las respuestas.</p></div><span className="text-[11px] text-muted">{periodoLabel}</span></div>
      <div className="grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <section className="rounded-xl border border-line bg-card p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-ink">Listado de preguntas</h3><p className="mt-1 text-[10px] text-muted">Seleccioná una para actualizar el gráfico</p></div><span className="text-[10px] text-muted">{preguntas.length} visibles</span></div><div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">{preguntas.map((item, index) => <button key={item.id} type="button" onClick={() => onSelect(item)} className={`w-full rounded-lg border p-3 text-left transition ${codigo === item.id ? 'border-brand bg-brand-soft shadow-sm' : 'border-line hover:border-brand-line'}`}><span className="text-[9px] font-bold uppercase tracking-wider text-brand">{item.dimension}</span><span className="mt-1 block text-[11px] font-semibold leading-4 text-ink-2"><span className="mr-1 text-brand">{String(index + 1).padStart(2, '0')}</span>{item.pregunta}</span><span className="mt-1 block text-[9px] text-muted">{item.total.toLocaleString('es-BO')} respuestas</span></button>)}</div></section>
        <section className="self-start rounded-xl border border-line bg-card p-4 shadow-sm xl:sticky xl:top-5"><div className="flex items-start justify-between gap-3 border-b border-line pb-4"><div><span className="text-[9px] font-bold uppercase tracking-wider text-brand">Dimensión {dimension}</span><h3 className="mt-1 max-w-2xl text-base font-bold leading-6 text-ink">{texto}</h3></div>
          {/* Exporta respuestas individuales (endpoint solo Admin/Superadmin) */}
          <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
            <div className="flex gap-3">
              <button type="button" onClick={() => onExportar('xlsx')} className="text-[10px] font-bold text-brand hover:underline">Excel</button>
              <button type="button" onClick={() => onExportar('json')} className="text-[10px] font-bold text-brand hover:underline">JSON</button>
            </div>
          </RoleGate>
        </div><div className="mt-5"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold text-ink">Distribución de respuestas</h4><span className="text-[10px] text-muted">{totalPregunta.toLocaleString('es-BO')} respuestas · {periodoLabel}</span></div><div className="space-y-4">{respuestas.map((item) => { const color = obtenerColorRespuesta(item.respuesta); return <div key={item.respuesta} className="grid grid-cols-[minmax(0,1fr)_2fr_42px] items-center gap-3"><span className="text-[10px] text-ink-2">{item.respuesta}</span><div className="h-6 overflow-hidden rounded-sm bg-subtle"><div className="h-full rounded-sm" style={{ width: `${item.porcentaje}%`, backgroundColor: color }} /></div><span className="text-right text-[10px] font-bold" style={{ color }}>{item.porcentaje}%</span></div>; })}</div></div></section>
      </div>
    </section>
  );
}

function obtenerColorRespuesta(respuesta) {
  const colores = ['#b65a78', '#c47791', '#d092a6', '#9f617b', '#8f7480', '#aa7188', '#c18a9b'];
  const texto = String(respuesta ?? '');
  const hash = [...texto].reduce((acumulado, caracter) => acumulado + caracter.charCodeAt(0), 0);
  return colores[hash % colores.length];
}

function FilterSelect({ label, value }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span><select value={value} disabled className="w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2 outline-none focus:border-brand"><option>{value}</option></select></label>;
}

function MetricCard({ label, value, detail, trend, accent, icon, warning }) {
  return <article className="flex min-h-[118px] items-start justify-between rounded-xl border border-line bg-card p-4 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><p className={`mt-2 text-xl font-bold leading-none ${warning ? 'text-brand' : 'text-ink'}`}>{value} {accent && <span className="text-sm">{accent}</span>}</p><p className="mt-3 text-[10px] text-muted">{detail}</p>{trend && <span className="mt-2 inline-flex text-[10px] font-bold text-[#3c8d66]">{trend}</span>}</div><span className={`rounded-lg p-2 ${warning ? 'bg-brand-soft text-brand' : 'bg-subtle text-brand'}`}>{icon}</span></article>;
}

function ChartPanel({ title, children }) {
  return <article className="min-h-[285px] rounded-xl border border-line bg-card p-4 shadow-sm"><h2 className="mb-2 text-xs font-bold text-ink">{title}</h2><div className="h-[225px]">{children}</div></article>;
}

function Finding({ tone, icon, text }) {
  const tones = { red: 'border-brand text-brand', gold: 'border-[#d49b31] text-[#b77d18]', gray: 'border-muted text-muted', green: 'border-[#7cbb9a] text-[#3c8d66]' };
  return <div className={`rounded-lg border-l-2 bg-card px-3 py-3 text-[10px] leading-relaxed text-ink-2 shadow-sm ${tones[tone]}`}><span className="mr-1 inline-flex align-middle">{icon}</span>{text}</div>;
}
