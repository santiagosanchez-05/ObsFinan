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
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
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

// El dashboard es público: sin sesión no se manda el header (un "Bearer null"
// lo rechazaría el backend como token inválido).
function headersDe(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ICAPage() {
  const [mostrarUpload, setMostrarUpload] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const fechaActual = new Date();
  const trimestreActual = Math.floor(fechaActual.getMonth() / 3) + 1;
  const [comunidades, setComunidades] = useState([]);
  const [communityId, setCommunityId] = useState('');
  const [cargandoComunidades, setCargandoComunidades] = useState(false);
  const [mostrarExportar, setMostrarExportar] = useState(false);
  const [quarter, setQuarter] = useState(trimestreActual);
  const [year, setYear] = useState(fechaActual.getFullYear());
  const [estado, setEstado] = useState({ cargando: false, resultado: null, error: null });
  const { user, token } = useAuth();
  const [modalUpload, setModalUpload] = useState(null);
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
  useEffect(() => {
    let cancelado = false;

    async function cargarComunidades() {
      setCargandoComunidades(true);

      try {
        const res = await fetch('/api/ica/comunidades', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar las comunas');
        }

        if (!cancelado) {
          setComunidades(data.comunidades || []);
        }
      } catch (err) {
        if (!cancelado) {
          setEstado((prev) => ({
            ...prev,
            error: err.message
          }));
        }
      } finally {
        if (!cancelado) {
          setCargandoComunidades(false);
        }
      }
    }

    if (token) {
      cargarComunidades();
    }

    return () => {
      cancelado = true;
    };
  }, [token]);
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

  async function handleConfirmarUpload() {
    if (!communityId || !archivo || !quarter || !year) {
      setEstado({
        cargando: false,
        resultado: null,
        error: 'Completa comuna, año, trimestre y archivo.'
      });
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
    formData.append('communityId', communityId);

    try {
      const res = await fetch('/api/ica/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {

        const esFormatoInvalido = data.tipo === 'formato_invalido';
        if (esFormatoInvalido) {
          setModalUpload({ tipo: 'formato', mensaje: data.error || 'El archivo no tiene las columnas esperadas o contiene filas vacías.' });
          setEstado({ cargando: false, resultado: null, error: null });
          return;
        }
        setEstado({ cargando: false, resultado: null, error: data.error || 'No se pudo subir el archivo' });
        return;
      }
      setEstado({ cargando: false, resultado: data, error: null });
      setModalUpload({ tipo: 'exito' });
    } catch {
      setEstado({ cargando: false, resultado: null, error: 'Error de conexión con el servidor' });
    }
  }
  async function handleDescargarPlantilla() {
    try {
      const res = await fetch('/api/ica/template', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo descargar la plantilla');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const enlace = document.createElement('a');
      enlace.href = url;
     enlace.download = 'plantilla_diccionario_ica.xlsx';

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar plantilla ICA:', err);
    }
  }
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
  function handleCancelar() {
    setMostrarUpload(false);
    setArchivo(null);
    setCommunityId('');
    setQuarter(trimestreActual);
    setYear(fechaActual.getFullYear());
    setModalUpload(null);
    setEstado({ cargando: false, resultado: null, error: null });
  }

  function cerrarModalUpload() {
    if (modalUpload?.tipo === 'exito') {
      handleCancelar();
    } else {
      setModalUpload(null);
    }
  }
  return (
    <>
      {modalUpload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6" onClick={cerrarModalUpload}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${modalUpload.tipo === 'exito' ? 'bg-[#eaf6ef] text-[#3c8d66]' : 'bg-[#fdeceb] text-[#a00046]'
                }`}>
                {modalUpload.tipo === 'exito' ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#252927]">
                  {modalUpload.tipo === 'exito' ? 'Archivo cargado correctamente' : 'Formato de archivo incorrecto'}
                </h2>
                <p className="mt-1 text-xs text-[#8a9290]">
                  {modalUpload.tipo === 'exito' ? 'La carga se registró correctamente.' : modalUpload.mensaje}
                </p>
              </div>
            </div>

            {modalUpload.tipo === 'exito' ? (
              <div className="mt-5 rounded-lg bg-[#f4f6f8] p-3 text-xs text-[#59615e]">
                <p><span className="font-semibold">Archivo:</span> {archivo?.name}</p>
                <p className="mt-1"><span className="font-semibold">Registros cargados:</span> {estado.resultado?.filasInsertadas}</p>
                <p className="mt-1"><span className="font-semibold">Año:</span> {year} · <span className="font-semibold">Trimestre:</span> Q{quarter}</p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg bg-[#f4f6f8] p-3 text-xs text-[#59615e]">
                Verifica que el Excel corresponda al formato de las 32 preguntas del instrumento ICA y que no contenga columnas adicionales.</div>
            )}

            {modalUpload.tipo === 'exito' && estado.resultado?.filasConError?.length > 0 && (
              <p className="mt-3 flex items-center gap-1 text-xs text-[#b77d18]">
                <AlertCircle size={13} /> {estado.resultado.filasConError.length} filas con error.
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {modalUpload.tipo === 'formato' && (
                <button
                  type="button"
                  onClick={handleDescargarPlantilla}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce1e4] px-4 py-2 text-xs font-semibold text-[#a00046] hover:bg-[#fff3f7]"
                >
                  <Download size={13} /> Descargar formato
                </button>
              )}
              <button onClick={cerrarModalUpload} className="rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white hover:bg-[#820039]">
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
              <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Índice de Calidad Aseguradora</h1>
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

          <nav className="mb-5 flex flex-wrap gap-1 rounded-xl border border-[#e2e6e8] bg-white p-1.5 shadow-sm" aria-label="Vistas del módulo ICA">
            {[
              ['dashboard', 'Dashboard ICA'],
              ['dimensiones', 'Perfil de dimensiones'],
              ['preguntas', 'Explorador de preguntas'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setVista(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 ${vista === id ? 'bg-[#a00046] text-white shadow-sm' : 'text-[#69716e] hover:bg-[#fff3f7] hover:text-[#a00046]'}`}>
                {label}
              </button>
            ))}
          </nav>

          {vista === 'dashboard' && <>
            {errorDashboard && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorDashboard}</p>}
            <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777f7c]"><Filter size={14} className="text-[#a00046]" /> Filtros de consulta</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                {(!user || user.role === ROLES.SUPERADMIN) && sedesDisponibles.length > 1 && <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Sede</span><select value={filtros.campusId} onChange={(event) => setFiltros((actual) => ({ ...actual, campusId: event.target.value, communityId: '' }))} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Todas</option>{sedesDisponibles.map((sede) => <option key={sede.campusId} value={sede.campusId}>{sede.nombre}</option>)}</select></label>}
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Género</span><select value={filtros.gender} onChange={(event) => setFiltros((actual) => ({ ...actual, gender: event.target.value, communityId: '' }))} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Todos</option>{generosDisponibles.map((genero) => <option key={genero} value={genero}>{genero === 'hombres' ? 'Hombres' : 'Mujeres'}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Trimestre</span><select value={filtros.quarter} onChange={(event) => setFiltros((actual) => ({ ...actual, year: '', quarter: event.target.value }))} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Todos</option>{[1, 2, 3, 4].map((trimestre) => <option key={trimestre} value={trimestre}>Q{trimestre}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Comuna</span><select value={filtros.communityId} onChange={(event) => setFiltros((actual) => ({ ...actual, communityId: event.target.value }))} className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845]"><option value="">Todas</option>{comunidadesDisponibles.map((comunidad) => (
                  <option
                    key={comunidad.communityId}
                    value={comunidad.communityId}
                  >
                    {comunidad.nombre}
                  </option>
                ))}</select></label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
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
                    className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]"
                  >
                    <option value="">Todas</option>

                    {dimensionesDisponibles.map((dimension) => (
                      <option key={dimension} value={dimension}>
                        {dimension}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => setFiltrosAplicados(filtros)} className="rounded-lg bg-[#252927] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a00046]">Aplicar filtros</button>
              </div>
            </section>
            {mostrarUpload && (
              <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#252927]">Subir dataset ICA</h2>
                  <button onClick={handleCancelar} className="text-[#8a9290] hover:text-[#a00046]"><X size={16} /></button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">Sede</span>
                    <p className="rounded-lg border border-[#dfe4e5] bg-[#f4f6f8] px-3 py-2 text-xs text-[#414845]">
                      {user?.campusName ?? 'Cochabamba'}
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
                      Comuna
                    </span>

                    <select
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      disabled={cargandoComunidades}
                      className="w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs"
                    >
                      <option value="">
                        {cargandoComunidades ? 'Cargando...' : 'Selecciona una comuna'}
                      </option>

                      {comunidades.map((comunidad) => (
                        <option key={comunidad.id} value={comunidad.id}>
                          {new Set(comunidades.map((c) => c.campusId)).size > 1 && comunidad.sede ? `${comunidad.nombre} (${comunidad.sede})` : comunidad.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    Excel (.xlsx/.xls) · Debe contener las 32 preguntas del instrumento ICA.</p>
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
              <div className="flex flex-col gap-2 border-b border-[#edf0f1] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-[#252927]">Desglose detallado por comuna</h2><p className="mt-1 text-xs text-[#8a9290]">Resultados del período seleccionado</p></div><div className="relative">
                <button
                  onClick={() => setMostrarExportar(!mostrarExportar)}
                  className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#a00046] hover:underline"
                >
                  <Download size={13} />
                  Exportar
                </button>

                {mostrarExportar && (
                  <div className="absolute right-0 z-20 mt-2 w-32 rounded-lg border bg-white shadow-lg">
                    <button
                      onClick={() => {
                        handleExportar('csv');
                        setMostrarExportar(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                    >
                      CSV
                    </button>

                    <button
                      onClick={() => {
                        handleExportar('json');
                        setMostrarExportar(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100"
                    >
                      JSON
                    </button>
                  </div>
                )}
              </div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]"><tr>{['Comuna', 'Conocimiento', 'Uso', 'Educación', 'Previsión', 'ICA hombres', 'ICA mujeres', 'Índice general'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{comunas.map((row, index) => <tr key={row.id} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]"><td className="px-4 py-3 font-semibold text-[#252927]">{row.nombre}</td>{[row.conocimiento, row.uso, row.educacion, row.prevision, row.hombres, row.mujeres].map((value, cellIndex) => <td key={`${row.id}-${cellIndex}`} className={`px-4 py-3 ${cellIndex === 2 ? 'font-semibold text-[#a00046]' : ''}`}>{value}</td>)}<td className="px-4 py-3 font-bold"><span className={`rounded-full px-2 py-1 text-[10px] ${index === 0 ? 'bg-[#f9e5ed] text-[#a00046]' : 'bg-[#f1f3f3] text-[#414845]'}`}>{row.valor}</span></td></tr>)}</tbody></table></div>
              <div className="flex items-center justify-between border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290]"><span>Mostrando {comunas.length} comunas registradas</span><div className="flex gap-2"><button disabled className="rounded border border-[#e4e8e8] px-2 py-1 disabled:opacity-50">Anterior</button><button className="rounded border border-[#e4e8e8] px-2 py-1 hover:border-[#a00046]">Siguiente</button></div></div>
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
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a00046]">Módulo ICA · Perfil de dimensiones</p><h2 className="text-xl font-bold text-[#252927]">Comparativa multidimensional</h2><p className="mt-1 text-xs text-[#8a9290]">Lectura del bienestar financiero por dimensión y período.</p></div>
        <span className="text-[11px] text-[#8a9290]">{periodoLabel}</span>
      </div>
      {!datos.length && <p className="rounded-lg border border-[#e2e6e8] bg-white px-4 py-5 text-sm text-[#6d7673]">No hay mediciones ICA para el período seleccionado.</p>}
      <div className={`grid gap-4 lg:grid-cols-[1.25fr_.75fr] ${datos.length ? '' : 'hidden'}`}>
        <ChartPanel title="Perfil del ICA">
          <ResponsiveContainer width="100%" height="100%"><RadarChart data={datos} outerRadius="68%"><PolarGrid stroke="#d7dcdb" /><PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#59615e' }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#8a9290' }} /><Radar dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.2} strokeWidth={2} /><Tooltip {...chartTooltip} formatter={(value) => [`${value} pts`, 'Puntaje']} /></RadarChart></ResponsiveContainer>
        </ChartPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{datos.map((item) => <MetricCard key={item.dimension} label={item.dimension} value={item.valor} detail="Puntaje promedio" accent="/100" warning={item.valor < 60} icon={<BarChart3 size={18} />} />)}</div>
      </div>
      <section className="rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#252927]">Ranking de dimensiones</h3><p className="mt-1 text-[11px] text-[#8a9290]">Ordenado por puntaje promedio actual</p></div><span className="text-[10px] text-[#8a9290]">Mayor a menor</span></div><div className="space-y-3">{[...datos].sort((a, b) => b.valor - a.valor).map((item, index) => <div key={item.dimension} className="flex items-center gap-3"><span className="w-5 text-center text-[10px] font-bold text-[#a00046]">{index + 1}</span><span className="w-24 text-[11px] text-[#59615e]">{item.dimension}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f2f2]"><div className="h-full rounded-full bg-[#a00046]" style={{ width: `${item.valor}%` }} /></div><span className="w-10 text-right text-[11px] font-bold text-[#252927]">{item.valor}</span></div>)}</div></section>
      {metricas && <p className="rounded-lg border-l-2 border-[#a00046] bg-white px-3 py-3 text-[11px] text-[#59615e] shadow-sm">La dimensión crítica del período es <strong className="text-[#a00046]">{metricas.dimensionCritica.dimension}</strong>, con un promedio de {metricas.dimensionCritica.valor} puntos.</p>}
    </section>
  );
}

function QuestionExplorerView({ preguntas, pregunta, onSelect, periodoLabel, total, error, onExportar }) {
  if (error) return <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!pregunta || !preguntas.length) return <p className="mb-5 rounded-lg border border-[#e2e6e8] bg-white px-4 py-5 text-sm text-[#6d7673]">No hay respuestas de encuestas para los filtros seleccionados.</p>;

  const { id: codigo, dimension, pregunta: texto, respuestas = [], total: totalPregunta = total } = pregunta;

  return (
    <section className="mb-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a00046]">Módulo ICA · Explorador</p><h2 className="text-xl font-bold text-[#252927]">Explorador de preguntas</h2><p className="mt-1 text-xs text-[#8a9290]">Seleccioná una pregunta para consultar cómo se distribuyen las respuestas.</p></div><span className="text-[11px] text-[#8a9290]">{periodoLabel}</span></div>
      <div className="grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <section className="rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-[#252927]">Listado de preguntas</h3><p className="mt-1 text-[10px] text-[#8a9290]">Seleccioná una para actualizar el gráfico</p></div><span className="text-[10px] text-[#8a9290]">{preguntas.length} visibles</span></div><div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">{preguntas.map((item, index) => <button key={item.id} type="button" onClick={() => onSelect(item)} className={`w-full rounded-lg border p-3 text-left transition ${codigo === item.id ? 'border-[#a00046] bg-[#fff5f8] shadow-sm' : 'border-[#edf0f1] hover:border-[#d6a4b7]'}`}><span className="text-[9px] font-bold uppercase tracking-wider text-[#a00046]">{item.dimension}</span><span className="mt-1 block text-[11px] font-semibold leading-4 text-[#414845]"><span className="mr-1 text-[#a00046]">{String(index + 1).padStart(2, '0')}</span>{item.pregunta}</span><span className="mt-1 block text-[9px] text-[#8a9290]">{item.total.toLocaleString('es-BO')} respuestas</span></button>)}</div></section>
        <section className="self-start rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm xl:sticky xl:top-5"><div className="flex items-start justify-between gap-3 border-b border-[#edf0f1] pb-4"><div><span className="text-[9px] font-bold uppercase tracking-wider text-[#a00046]">Dimensión {dimension}</span><h3 className="mt-1 max-w-2xl text-base font-bold leading-6 text-[#252927]">{texto}</h3></div>
          {/* Exporta respuestas individuales (endpoint solo Admin/Superadmin) */}
          <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
            <div className="flex gap-3">
              <button type="button" onClick={() => onExportar('xlsx')} className="text-[10px] font-bold text-[#a00046] hover:underline">Excel</button>
              <button type="button" onClick={() => onExportar('json')} className="text-[10px] font-bold text-[#a00046] hover:underline">JSON</button>
            </div>
          </RoleGate>
        </div><div className="mt-5"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold text-[#252927]">Distribución de respuestas</h4><span className="text-[10px] text-[#8a9290]">{totalPregunta.toLocaleString('es-BO')} respuestas · {periodoLabel}</span></div><div className="space-y-4">{respuestas.map((item) => { const color = obtenerColorRespuesta(item.respuesta); return <div key={item.respuesta} className="grid grid-cols-[minmax(0,1fr)_2fr_42px] items-center gap-3"><span className="text-[10px] text-[#59615e]">{item.respuesta}</span><div className="h-6 overflow-hidden rounded-sm bg-[#f0f2f2]"><div className="h-full rounded-sm" style={{ width: `${item.porcentaje}%`, backgroundColor: color }} /></div><span className="text-right text-[10px] font-bold" style={{ color }}>{item.porcentaje}%</span></div>; })}</div></div></section>
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
