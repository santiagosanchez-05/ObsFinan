import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROLES } from "../../../shared/AuthContext";
import RoleGate from "../../../shared/RoleGate";
import CitaAcademica from "../../../shared/CitaAcademica";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  History,
  Plus,
  TrendingUp,
  Upload,
  Users,
  X,
} from "lucide-react";
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
} from "recharts";
import FiltrosSpe from "../components/FiltrosSpe";
import InsightsSpe from "../components/InsightsSpe";
import ExportarSpe from "../components/ExportarSpe";

const COLORES = ["#961d4b", "#e3e7ee"];
const TOOLTIP = {
  contentStyle: {
    border: 0,
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(31, 34, 32, .12)",
  },
};

function prepararExpectativas(expectativas = {}) {
  const categorias = expectativas.pib?.map((item) => item.categoria) || [];
  return categorias.map((categoria) => ({
    categoria,
    pib:
      expectativas.pib?.find((item) => item.categoria === categoria)
        ?.cantidad || 0,
    inflacion:
      expectativas.inflacion?.find((item) => item.categoria === categoria)
        ?.cantidad || 0,
    tipoCambio:
      expectativas.tipoCambio?.find((item) => item.categoria === categoria)
        ?.cantidad || 0,
  }));
}
// El período puede venir con año y semestre, solo año, solo semestre, o vacío.
function etiquetaPeriodo({ year, semester } = {}) {
  if (year && semester) return `Sem ${semester} · ${year}`;
  if (year) return `Año ${year}`;
  if (semester) return `Semestre ${semester}`;
  return "Sin datos";
}

export default function SPEPage() {
  const [filtros, setFiltros] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [errorDashboard, setErrorDashboard] = useState("");
  const [mostrarCarga, setMostrarCarga] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const datos = dashboard
    ? {
        ...dashboard,
        indices: dashboard.indices || {},
        indicesAnterior: dashboard.indicesAnterior || {},
        periodo: dashboard.periodo || {},
        expectativas: prepararExpectativas(dashboard.secciones?.expectativas),
        barreras: dashboard.secciones?.comercio?.barreraPrincipal || [],
        propension: dashboard.secciones?.inversion?.propension || [],
      }
    : {
        totalEmpresas: 0,
        indices: {},
        indicesAnterior: {},
        periodo: {},
        expectativas: [],
        barreras: [],
        propension: [],
        opcionesFiltros: undefined,
      };
  const propensionSi =
    datos.propension.find((item) => item.name === "Sí")?.value || 0;
  const variacion = (actual, anterior) =>
    Number.isFinite(actual) && Number.isFinite(anterior)
      ? `${actual - anterior >= 0 ? "+" : ""}${(actual - anterior).toFixed(1)} pts`
      : "Sin comparación";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(
      Object.entries(filtros).filter(([, value]) => value),
    );

    async function cargarDashboard() {
      try {
        const response = await fetch(
          `/api/spe${params.toString() ? `?${params}` : ""}`,
          { signal: controller.signal },
        );
        const resultado = await response.json();
        if (!response.ok)
          throw new Error(
            resultado.error || "No se pudo cargar el dashboard SPE",
          );
        setDashboard(resultado);
        setErrorDashboard("");
      } catch (error) {
        if (error.name !== "AbortError") setErrorDashboard(error.message);
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7eaf0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-maroon">
              <span className="h-1.5 w-1.5 rounded-full bg-maroon" /> Módulo
              sector privado exportador
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[30px]">
              Confianza y expectativas del Sector Exportador
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Encuesta semestral a empresas exportadoras bolivianas
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-[11px] font-semibold text-[#5e6763]">
              <FileCheck2 size={14} className="text-[#3d916b]" /> Datos
              aprobados
            </span>
            <RoleGate allow={[ROLES.SUPERADMIN]}>
              <Link
                to="/spe/historial"
                className="inline-flex items-center gap-2 rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs font-semibold text-[#59615e] shadow-sm transition hover:border-[#961d4b] hover:text-[#961d4b]"
              >
                <History size={14} /> Historial de registros
              </Link>
              <button
                type="button"
                onClick={() => setMostrarCarga((valor) => !valor)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d6a4b7] bg-white px-3 py-2 text-xs font-semibold text-[#961d4b] transition hover:bg-[#fff3f7]"
              >
                <Upload size={14} /> Subir dataset
              </button>
              <Link
                to="/spe/registrar"
                className="inline-flex items-center gap-2 rounded-lg bg-[#961d4b] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#780f39]"
              >
                <Plus size={14} /> Registrar registro
              </Link>
            </RoleGate>
          </div>
        </div>
        <ExportarSpe filtros={filtros} />
        {mostrarCarga && (
          <section className="relative ml-auto max-w-md rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#252927]">
                  Subir dataset SPE
                </h2>
                <p className="mt-1 text-[11px] text-[#8a9290]">
                  Carga un archivo Excel con encuestas aprobadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarCarga(false)}
                className="rounded-md p-1 text-[#8a9290] hover:bg-[#fff3f7] hover:text-[#961d4b]"
                aria-label="Cerrar carga"
              >
                <X size={16} />
              </button>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#d6a4b7] bg-[#fff8fa] p-3 transition hover:border-[#961d4b]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#961d4b]">
                <FileSpreadsheet size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[#59615e]">
                  {archivo?.name || "Seleccionar archivo Excel"}
                </span>
                <span className="mt-1 block text-[10px] text-[#8a9290]">
                  Formatos permitidos: .xlsx y .xls
                </span>
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) =>
                  setArchivo(event.target.files?.[0] || null)
                }
                className="hidden"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setArchivo(null);
                  setMostrarCarga(false);
                }}
                className="rounded-lg bg-[#e8ecf2] px-4 py-2 text-xs font-semibold text-[#687487]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!archivo}
                className="rounded-lg bg-[#961d4b] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cargar
              </button>
            </div>
          </section>
        )}

        <FiltrosSpe
          filtros={filtros}
          onAplicar={setFiltros}
          opciones={datos?.opcionesFiltros}
        />

        {errorDashboard && (
          <p className="rounded-lg border border-[#f2c7d4] bg-[#fff4f7] px-3 py-2 text-xs text-[#961d4b]">
            {errorDashboard}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Empresas encuestadas"
            value={datos.totalEmpresas}
            detail="Respuestas aprobadas"
            icon={<Users size={19} />}
          />
          <StatCard
            label="ICE promedio"
            value={`${datos.indices.ice} pts`}
            detail="Índice de confianza empresarial"
            icon={<Gauge size={19} />}
            variation={variacion(datos.indices.ice, datos.indicesAnterior.ice)}
          />
          <StatCard
            label="Propensión a invertir"
            value={`${propensionSi}% Sí`}
            detail="En los próximos 12 meses"
            icon={<TrendingUp size={19} />}
          />
          <StatCard
            label="Período actual"
            value={etiquetaPeriodo(datos.periodo)}
            detail="Última medición disponible"
            icon={<Building2 size={19} />}
          />
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_1.95fr]">
          <Panel
            title="Propensión a invertir en 12 meses"
            icon={<CircleDollarSign size={16} />}
          >
            <div className="relative h-[215px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datos.propension}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={94}
                    paddingAngle={0}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {datos.propension.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORES[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(value) => [`${value}%`, "Respuestas"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-3xl text-[#252927]">
                  {propensionSi}%
                </strong>
                <span className="text-[10px] text-[#8a9290]">invertirá</span>
              </div>
            </div>
            <div className="flex justify-center gap-5 text-[10px] text-[#737b78]">
              <span>
                <i className="mr-1 inline-block h-2 w-2 bg-[#961d4b]" /> Sí
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 bg-[#e3e7ee]" /> No
              </span>
            </div>
          </Panel>
          <Panel
            title="Expectativas macroeconómicas"
            icon={<ChartNoAxesCombined size={16} />}
          >
            <div className="h-[245px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datos.expectativas}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 100, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#eef0f1" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    tick={{ fontSize: 9, fill: "#69716e" }}
                    tickLine={false}
                    axisLine={false}
                    width={96}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(value) => [`${value} empresas`, "Respuestas"]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="pib"
                    name="Crecimiento del PIB"
                    fill="#961d4b"
                    barSize={12}
                    radius={[0, 2, 2, 0]}
                  />
                  <Bar
                    dataKey="inflacion"
                    name="Inflación"
                    fill="#b54363"
                    barSize={12}
                    radius={[0, 2, 2, 0]}
                  />
                  <Bar
                    dataKey="tipoCambio"
                    name="Tipo de cambio"
                    fill="#d17b91"
                    barSize={12}
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <Panel
          title="Principales barreras al comercio exterior (Empresas)"
          icon={<BarChart3 size={16} />}
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos.barreras}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 135, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={true}
                  horizontal={false}
                  stroke="#eef0f1"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#69716e" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="barrera"
                  tick={{ fontSize: 9, fill: "#59615e" }}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip
                  {...TOOLTIP}
                  formatter={(value) => [`${value}%`, "Empresas"]}
                />
                <Bar
                  dataKey="porcentaje"
                  name="Empresas"
                  fill="#961d4b"
                  barSize={22}
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <IndexCard
            label="IEE"
            name="Índice de expectativas"
            value={datos.indices.iee}
            previous={datos.indicesAnterior.iee}
          />
          <IndexCard
            label="ICE"
            name="Índice de confianza"
            value={datos.indices.ice}
            previous={datos.indicesAnterior.ice}
            active
          />
          <IndexCard
            label="IIE"
            name="Índice de inversión"
            value={datos.indices.iie}
            previous={datos.indicesAnterior.iie}
          />
          <IndexCard
            label="ICIE"
            name="Índice de competitividad"
            value={datos.indices.icie}
            previous={datos.indicesAnterior.icie}
          />
        </section>
        <InsightsSpe insights={datos?.insights ?? []} />
        <CitaAcademica recurso="spe" />
      </div>
    </main>
  );
}

function StatCard({ label, value, detail, icon, variation }) {
  return (
    <article className="rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a9290]">
            {label}
          </p>
          <p className="mt-2 text-xl font-bold text-[#252927]">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f7eaf0] text-maroon">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-[#8a9290]">
        <span>{detail}</span>
        {variation && (
          <span className="font-bold text-[#3d916b]">{variation}</span>
        )}
      </div>
    </article>
  );
}

function Panel({ title, icon, children }) {
  return (
    <article className="rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-maroon">{icon}</span>
        <h2 className="text-sm font-bold text-[#252927]">{title}</h2>
      </div>
      {children}
    </article>
  );
}

function IndexCard({ label, name, value, previous, active }) {
  const change =
    Number.isFinite(value) && Number.isFinite(previous)
      ? value - previous
      : null;
  return (
    <article
      className={`rounded-xl border p-4 shadow-sm ${active ? "border-[#961d4b] bg-[#fff7fa]" : "border-[#e2e6e8] bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-maroon">{label}</span>
        <span className="text-[10px] text-[#8a9290]">vs. anterior</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#252927]">
        {value ?? "-"}
        <span className="ml-1 text-xs font-normal text-[#8a9290]">pts</span>
      </p>
      <p className="mt-1 text-[10px] text-[#707875]">{name}</p>
      <p
        className={`mt-3 flex items-center gap-1 text-[10px] font-bold ${change === null ? "text-[#8a9290]" : change >= 0 ? "text-[#3d916b]" : "text-[#b5445d]"}`}
      >
        {change === null ? (
          "Sin comparación"
        ) : (
          <>
            {change >= 0 ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}{" "}
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)} pts
          </>
        )}
      </p>
    </article>
  );
}
