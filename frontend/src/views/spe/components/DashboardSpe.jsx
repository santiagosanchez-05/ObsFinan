import { useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Award, Building2, Globe, Landmark, LineChart, Medal, PiggyBank, Scale, Ship, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────
// TEMPORAL: datos de prueba, solo para la parte visual.
// Cuando Liz conecte GET /api/spe: borrar TODO este bloque (hasta la línea
// de cierre) y la línea `datosProp ?? DATOS_PRUEBA` del componente.
// ─────────────────────────────────────────────────────────────────────────
// Datos de prueba con la forma del contrato de obtenerDashboardSpe (spe.dashboard.service.js).
// Preguntas y opciones tomadas de la ENCUESTA ÚNICA INTEGRADA SOCOMEX–SOCIFIN (Word).
// Los NÚMEROS son inventados: solo sirven para probar la pantalla.
// Porcentajes en escala 0-100 (confirmar con Liz).

const N = 41; // empresas del mock

// Opción única: [{ opcion, cantidad, porcentaje }], el porcentaje suma 100.
const conteo = (pares) => {
  const total = pares.reduce((suma, [, cantidad]) => suma + cantidad, 0);
  return pares.map(([opcion, cantidad]) => ({ opcion, cantidad, porcentaje: Math.round((cantidad / total) * 1000) / 10 }));
};
// Selección múltiple: el porcentaje es sobre las empresas, así que la suma puede pasar de 100.
const multiple = (pares) =>
  pares.map(([opcion, cantidad]) => ({ opcion, cantidad, porcentaje: Math.round((cantidad / N) * 1000) / 10 }));
// Escalas 1-5: [{ factor, promedio }]
const promedios = (pares) => pares.map(([factor, promedio]) => ({ factor, promedio }));

const EXPECTATIVA_AUMENTA = ['Aumentará significativamente', 'Aumentará moderadamente', 'Estable', 'Disminuirá moderadamente', 'Disminuirá significativamente'];
const EXPECTATIVA_EXPORT = ['Aumentarán significativamente', 'Aumentarán moderadamente', 'Estables', 'Disminuirán moderadamente', 'Disminuirán significativamente'];
const con = (etiquetas, cantidades) => conteo(etiquetas.map((e, i) => [e, cantidades[i]]));

const DATOS_PRUEBA = {
  periodo: { year: 2026, semester: 1 },
  totalEmpresas: N,
  indices: { iee: 62.4, ice: 71.8, iie: 55.1, icie: 48.7 },
  indicesAnterior: { iee: 65.0, ice: 70.2, iie: 55.1, icie: 44.3 },
  secciones: {
    // Sección I
    caracterizacion: {
      aniosExportando: conteo([['Menos de 5', 7], ['6 a 10', 12], ['11 a 20', 13], ['Más de 20', 9]]),
      mercadosAtendidos: conteo([['1', 8], ['2 a 3', 15], ['4 a 5', 11], ['Más de 5', 7]]),
      ingresosExportaciones: conteo([['Menos del 25%', 9], ['26% al 50%', 14], ['51% al 75%', 11], ['Más del 75%', 7]]),
      departamento: conteo([['Santa Cruz', 19], ['La Paz', 12], ['Cochabamba', 10]]),
      sector: conteo([['Agroindustria', 10], ['Alimentos', 8], ['Manufactura', 7], ['Software y Servicios', 4], ['Construcción', 2], ['Químico', 2], ['Textiles', 5], ['Otro', 3]]),
      tamano: conteo([['Micro', 6], ['Pequeña', 14], ['Mediana', 13], ['Grande', 8]]),
      destino: conteo([['CAN', 12], ['MERCOSUR', 9], ['Norteamérica', 8], ['Europa', 7], ['Asia', 4], ['Otros', 1]]),
    },
    // Sección II (inflación y tipo de cambio usan las opciones del PIB, según la guía)
    expectativas: {
      pib: con(EXPECTATIVA_AUMENTA, [2, 9, 14, 12, 4]),
      inflacion: con(EXPECTATIVA_AUMENTA, [10, 16, 9, 5, 1]),
      tipoCambio: con(EXPECTATIVA_AUMENTA, [12, 14, 10, 4, 1]),
      exportaciones: con(EXPECTATIVA_EXPORT, [3, 13, 15, 8, 2]),
      // El contrato dice solo `{...}`: se asume { bolivia, empresa, sector } (promedios 1-5).
      situacion: { bolivia: 2.3, empresa: 3.1, sector: 2.7 },
    },
    // Sección III
    internacionalizacion: {
      feriasMisiones: 58.5,
      planeaPromocion: 73.2,
      nuevosMercados: 68.3,
      prioridadPromedio: 3.9,
      frecuencia: conteo([['Nunca', 2], ['Ocasionalmente', 11], ['Semestralmente', 9], ['Trimestralmente', 10], ['Permanentemente', 9]]),
      modalidad: conteo([['Venta directa', 17], ['Distribuidores', 10], ['Representantes comerciales', 6], ['Marketplace internacional', 3], ['Trading company', 3], ['Otro', 2]]),
    },
    // Sección IV
    competitividad: {
      valorAgregado: conteo([['Menos del 25%', 10], ['26% al 50%', 15], ['51% al 75%', 11], ['Más del 75%', 5]]),
      tieneCertificaciones: 68.3,
      factores: promedios([['Precio', 3.0], ['Calidad', 4.2], ['Innovación', 3.3], ['Valor agregado', 3.4], ['Cumplimiento de plazos', 3.9], ['Servicio al cliente', 4.0], ['Sostenibilidad', 3.5]]),
      certificaciones: multiple([['ISO', 19], ['Orgánica', 9], ['Comercio Justo', 5], ['HACCP', 14], ['Otras', 4]])
        .map(({ opcion, porcentaje }) => ({ certificacion: opcion, porcentaje })),
    },
    // Sección V
    comercio: {
      acuerdoComercial: conteo([['CAN', 16], ['MERCOSUR', 11], ['SGP', 6], ['ACE', 5], ['Otro', 3]]),
      preferenciasArancelarias: conteo([['Sí', 15], ['Parcialmente', 14], ['No', 12]]),
      ventajaCompetitiva: conteo([['Precio', 6], ['Calidad', 15], ['Innovación', 3], ['Marca', 4], ['Certificaciones', 4], ['Servicio', 6], ['Sostenibilidad', 3]]),
      debilidadCompetitiva: conteo([['Costos', 12], ['Logística', 9], ['Financiamiento', 8], ['Tecnología', 4], ['Capital humano', 3], ['Certificaciones', 2], ['Acceso a mercados', 3]]),
      barreraPrincipal: conteo([['Costos logísticos', 8], ['Transporte', 3], ['Aranceles', 2], ['Barreras técnicas', 2], ['Certificaciones', 1], ['Falta de financiamiento', 5], ['Disponibilidad de divisas', 13], ['Regulaciones', 6], ['Falta de información comercial', 1]])
        .map(({ opcion, porcentaje }) => ({ barrera: opcion, porcentaje })),
      logistica: promedios([['Logística internacional', 2.9], ['Transporte internacional', 2.7], ['Despacho aduanero', 2.5], ['Costos logísticos', 2.3], ['Infraestructura logística', 2.4], ['Facilitación del comercio', 2.6]]),
    },
    // Sección VI
    financiero: {
      escasezDivisas: conteo([['Mucho', 19], ['Moderadamente', 13], ['Poco', 7], ['Nada', 2]]),
      fuenteFinanciamiento: conteo([['Recursos propios', 17], ['Bancos', 15], ['Cooperativas', 3], ['Inversionistas', 4], ['Organismos internacionales', 2]]),
      factores: promedios([['Acceso al financiamiento', 2.8], ['Liquidez empresarial', 3.0], ['Disponibilidad de divisas', 2.1]]),
      instrumentos: multiple([['Acuerdos comerciales internacionales', 17], ['Sistema Generalizado de Preferencias (SGP)', 12], ['Régimen de Reintegro Arancelario', 15], ['Comercializadoras internacionales', 5], ['Regulaciones regionales', 6], ['Ninguno', 4]]),
      regulaciones: multiple([['Control de cambios', 26], ['Restricciones a las exportaciones', 12], ['Medidas no arancelarias', 7], ['Impuestos a la exportación', 8], ['Incertidumbre regulatoria', 19], ['Procedimientos aduaneros complejos', 10]]),
    },
    // Sección VII
    institucional: {
      factores: promedios([['Seguridad jurídica', 2.2], ['Estabilidad regulatoria', 2.0], ['Transparencia institucional', 2.4], ['Predictibilidad de las políticas relacionadas con comercio exterior', 2.1]]),
      medidaMayorImpacto: conteo([['Simplificación aduanera', 6], ['Acceso a divisas', 13], ['Estabilidad regulatoria', 9], ['Incentivos a exportación', 4], ['Mejora logística', 3], ['Promoción comercial internacional', 1], ['Financiamiento exportador', 5]]),
    },
    // Sección VIII
    inversion: {
      invirtio: 43.9,
      invertira: 51.2,
      factores: promedios([['Estabilidad macroeconómica', 4.6], ['Acceso a divisas', 4.5], ['Financiamiento', 4.0], ['Seguridad jurídica', 4.3], ['Simplificación de trámites', 3.8], ['Nuevos acuerdos comerciales', 3.6], ['Mejora logística', 3.7], ['Apertura de nuevos mercados', 3.9]]),
    },
  },
  opcionesFiltros: { periodos: [], departamentos: [], sectores: [], tamanos: [] },
};
// ───────────────────────── fin de los datos de prueba ─────────────────────

// Parte visual del dashboard SPE (US35). Mismos colores, tarjetas, tabs y tooltips que ICAPage.jsx.
// Uso en SPEPage.jsx, en lugar del <BloquePendiente />:  <DashboardSpe />
// `datos` sigue el contrato de obtenerDashboardSpe (spe.dashboard.service.js).

const chartTooltip = {
  contentStyle: { border: '0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(31, 34, 32, .12)' },
  cursor: { fill: '#fff3f7' },
};
const EJE = { fontSize: 9, fill: '#69716e' };
const ETIQUETA_VALOR = { fontSize: 10, fontWeight: 700, fill: '#59615e' };
const PALETA = ['#a00046', '#b65a78', '#d092a6', '#222725', '#8f7480', '#e5c3cf', '#c47791', '#59615e'];
const NOTA_ESCALA = 'Promedio de 1 a 5 · guinda intenso: por debajo de 3';

const INDICES = [
  { key: 'iee', label: 'IEE', nombre: 'Expectativas empresariales', icon: <TrendingUp size={22} /> },
  { key: 'ice', label: 'ICE', nombre: 'Competitividad exportadora', icon: <Medal size={22} /> },
  { key: 'iie', label: 'IIE', nombre: 'Internacionalización', icon: <Globe size={22} /> },
  { key: 'icie', label: 'ICIE', nombre: 'Clima para la inversión', icon: <Landmark size={22} /> },
];

// `label` es el nombre corto de la pestaña; `titulo` es el nombre completo de la sección en el Word.
const SECCIONES = [
  { id: 'caracterizacion', label: 'Caracterización', titulo: 'Caracterización empresarial', icon: Building2 },
  { id: 'expectativas', label: 'Expectativas', titulo: 'Situación económica y expectativas', icon: LineChart },
  { id: 'internacionalizacion', label: 'Internacionalización', titulo: 'Internacionalización', icon: Globe },
  { id: 'competitividad', label: 'Competitividad', titulo: 'Competitividad exportadora', icon: Award },
  { id: 'comercio', label: 'Comercio', titulo: 'Comercio internacional y acceso a mercados', icon: Ship },
  { id: 'financiero', label: 'Finanzas', titulo: 'Condiciones financieras', icon: Wallet },
  { id: 'institucional', label: 'Institucional', titulo: 'Entorno institucional', icon: Scale },
  { id: 'inversion', label: 'Inversión', titulo: 'Inversión y perspectiva futura', icon: PiggyBank },
];

// Expectativas (PIB, inflación, tipo de cambio, exportaciones): 5 opciones, de mayor aumento a mayor disminución.
const EXPECTATIVAS = [
  { label: 'Aumentará significativamente', color: '#a00046', texto: '#ffffff' },
  { label: 'Aumentará moderadamente', color: '#d092a6', texto: '#252927' },
  { label: 'Estable', color: '#e4e8e9', texto: '#252927' },
  { label: 'Disminuirá moderadamente', color: '#8a9290', texto: '#ffffff' },
  { label: 'Disminuirá significativamente', color: '#222725', texto: '#ffffff' },
];
const ETIQUETAS_SITUACION = { bolivia: 'Situación económica actual de Bolivia', empresa: 'Situación económica de su empresa', sector: 'Situación del sector exportador' };

const redondear = (n) => Math.round(Number(n) * 10) / 10;
const etiquetaDe = (item) => item.opcion ?? item.barrera ?? item.certificacion ?? item.factor ?? '';
const aConteo = (data = []) => data.map((i) => ({ etiqueta: etiquetaDe(i), valor: Number(i.porcentaje), cantidad: i.cantidad }));
const aEscala = (data = []) => data.map((i) => ({ etiqueta: i.factor, valor: Number(i.promedio) }));
const ordenado = (filas) => [...filas].sort((a, b) => b.valor - a.valor);

export default function DashboardSpe({ datos: datosProp, cargando = false, error = '' }) {
  // TEMPORAL: si SPEPage no manda datos, se muestran los de prueba.
  // Cuando haya backend: borrar esta línea y el bloque de datos de prueba, y usar `datos` directo.
  const datos = datosProp ?? DATOS_PRUEBA;
  const [seccion, setSeccion] = useState('caracterizacion');

  if (error) return <Aviso tono="error">{error}</Aviso>;
  if (cargando || !datos) return <Aviso>Cargando dashboard SPE…</Aviso>;
  if (!datos.totalEmpresas) return <Aviso>No hay encuestas aprobadas para los filtros seleccionados. Prueba con otro período o quita algún filtro.</Aviso>;

  const periodoLabel = datos.periodo ? `${datos.periodo.year} - Semestre ${datos.periodo.semester}` : 'Todos los períodos';
  const s = datos.secciones ?? {};
  const actual = SECCIONES.find((x) => x.id === seccion);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {INDICES.map((indice) => (
          <IndexCard key={indice.key} {...indice} value={datos.indices?.[indice.key]} anterior={datos.indicesAnterior?.[indice.key]} />
        ))}
      </section>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Secciones de la encuesta">
        {SECCIONES.map(({ id, label, icon: Icono }) => {
          const activa = seccion === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSeccion(id)}
              aria-current={activa ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-xs font-semibold shadow-sm transition ${activa ? 'border-[#a00046] bg-[#a00046] text-white' : 'border-[#e2e6e8] bg-white text-[#59615e] hover:border-[#a00046] hover:text-[#a00046]'}`}
            >
              <Icono size={16} className={`shrink-0 ${activa ? 'text-white' : 'text-[#b65a78]'}`} />
              <span className="leading-tight">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a00046]">Módulo SPE · Sección de la encuesta</p>
          <h2 className="text-xl font-bold text-[#252927]">{actual.titulo}</h2>
        </div>
        <span className="text-[11px] text-[#8a9290]">{periodoLabel} · {datos.totalEmpresas.toLocaleString('es-BO')} empresas encuestadas</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {seccion === 'caracterizacion' && <>
          <Panel titulo="Departamento"><Donut data={s.caracterizacion?.departamento} /></Panel>
          <Panel titulo="Tamaño de empresa"><Columnas filas={aConteo(s.caracterizacion?.tamano)} /></Panel>
          <Panel titulo="Sector exportador"><BarrasH filas={aConteo(s.caracterizacion?.sector)} ordenar /></Panel>
          <Panel titulo="Principal mercado de destino"><Donut data={s.caracterizacion?.destino} /></Panel>
          <Panel titulo="Años exportando"><Columnas filas={aConteo(s.caracterizacion?.aniosExportando)} /></Panel>
          <Panel titulo="Número de mercados internacionales atendidos"><Columnas filas={aConteo(s.caracterizacion?.mercadosAtendidos)} /></Panel>
          <Panel titulo="Porcentaje de ingresos que proviene de exportaciones" className="md:col-span-2"><Columnas filas={aConteo(s.caracterizacion?.ingresosExportaciones)} /></Panel>
        </>}

        {seccion === 'expectativas' && <>
          <Panel titulo="Situación actual" nota="Promedio de 1 a 5" className="md:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {situacionAArray(s.expectativas?.situacion).map((item) => (
                <Gauge key={item.factor} valor={item.promedio} max={5} sufijo="/ 5" etiqueta={item.factor} />
              ))}
            </div>
          </Panel>
          <Panel titulo="Evolución esperada" nota="% de empresas · opciones alineadas de mayor aumento a mayor disminución" className="md:col-span-2">
            <ExpectativasApiladas e={s.expectativas} />
          </Panel>
        </>}

        {seccion === 'internacionalizacion' && <>
          <Panel titulo="Planea ingresar a nuevos mercados"><Gauge valor={s.internacionalizacion?.nuevosMercados} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Prioridad de la expansión internacional" nota="Promedio de 1 a 5"><Gauge valor={s.internacionalizacion?.prioridadPromedio} max={5} sufijo="/ 5" etiqueta="Prioridad promedio" /></Panel>
          <Panel titulo="Participó en ferias o misiones comerciales" nota="Últimos 12 meses"><Gauge valor={s.internacionalizacion?.feriasMisiones} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Planea participar en promoción comercial internacional" nota="Próximos 12 meses"><Gauge valor={s.internacionalizacion?.planeaPromocion} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Frecuencia de análisis de mercados"><Columnas filas={aConteo(s.internacionalizacion?.frecuencia)} /></Panel>
          <Panel titulo="Modalidad para acceder a mercados"><BarrasH filas={aConteo(s.internacionalizacion?.modalidad)} ordenar /></Panel>
        </>}

        {seccion === 'competitividad' && <>
          <Panel titulo="Competitividad frente a competidores internacionales" nota="Promedio de 1 a 5"><RadarEscala filas={aEscala(s.competitividad?.factores)} /></Panel>
          <Panel titulo="Oferta exportable con valor agregado" nota="% de la oferta"><Columnas filas={aConteo(s.competitividad?.valorAgregado)} /></Panel>
          <Panel titulo="Cuenta con certificaciones internacionales"><Gauge valor={s.competitividad?.tieneCertificaciones} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Certificaciones que poseen" nota="% de empresas"><BarrasH filas={aConteo(s.competitividad?.certificaciones)} ordenar /></Panel>
        </>}

        {seccion === 'comercio' && <>
          <Panel titulo="Principal barrera para exportar"><BarrasH filas={aConteo(s.comercio?.barreraPrincipal)} ordenar /></Panel>
          <Panel titulo="Evaluación de la logística" nota={NOTA_ESCALA}><BarrasH filas={aEscala(s.comercio?.logistica)} escala /></Panel>
          <Panel titulo="Acuerdo comercial que más beneficia a la empresa"><Donut data={s.comercio?.acuerdoComercial} /></Panel>
          <Panel titulo="Aprovecha preferencias arancelarias"><Donut data={s.comercio?.preferenciasArancelarias} /></Panel>
          <Panel titulo="Principal ventaja competitiva"><BarrasH filas={aConteo(s.comercio?.ventajaCompetitiva)} ordenar /></Panel>
          <Panel titulo="Principal debilidad competitiva"><BarrasH filas={aConteo(s.comercio?.debilidadCompetitiva)} ordenar /></Panel>
        </>}

        {seccion === 'financiero' && <>
          <Panel titulo="Condiciones financieras" nota={NOTA_ESCALA}><Columnas filas={aEscala(s.financiero?.factores)} escala /></Panel>
          <Panel titulo="La escasez de divisas afecta su actividad exportadora"><Columnas filas={aConteo(s.financiero?.escasezDivisas)} /></Panel>
          <Panel titulo="Principal fuente de financiamiento"><Donut data={s.financiero?.fuenteFinanciamiento} /></Panel>
          <Panel titulo="Instrumentos que favorecen las exportaciones" nota="% de empresas · cada una marca hasta 2"><BarrasH filas={aConteo(s.financiero?.instrumentos)} ordenar /></Panel>
          <Panel titulo="Regulaciones más restrictivas para exportar" nota="% de empresas · cada una marca 2" className="md:col-span-2"><BarrasH filas={aConteo(s.financiero?.regulaciones)} ordenar /></Panel>
        </>}

        {seccion === 'institucional' && <>
          <Panel titulo="Entorno institucional" nota={NOTA_ESCALA}><BarrasH filas={aEscala(s.institucional?.factores)} escala /></Panel>
          <Panel titulo="Medida con mayor impacto en la competitividad"><BarrasH filas={aConteo(s.institucional?.medidaMayorImpacto)} ordenar /></Panel>
        </>}

        {seccion === 'inversion' && <>
          <Panel titulo="Invirtió en los últimos 12 meses"><Gauge valor={s.inversion?.invirtio} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Invertirá en los próximos 12 meses"><Gauge valor={s.inversion?.invertira} etiqueta="% de empresas" /></Panel>
          <Panel titulo="Factores que mejorarían las expectativas" nota="Promedio de 1 a 5" className="md:col-span-2"><RadarEscala filas={aEscala(s.inversion?.factores)} /></Panel>
        </>}
      </div>
    </div>
  );
}

// `situacion` puede venir como objeto { bolivia, empresa, sector } o como lista [{ factor, promedio }].
function situacionAArray(situacion) {
  if (!situacion) return [];
  if (Array.isArray(situacion)) return situacion;
  return Object.entries(situacion).map(([clave, promedio]) => ({ factor: ETIQUETAS_SITUACION[clave] ?? clave, promedio }));
}

/* ───────────── Tarjetas y contenedores ───────────── */

function IndexCard({ label, nombre, value, anterior, icon }) {
  const pendiente = value === null || value === undefined;
  const variacion = !pendiente && anterior !== null && anterior !== undefined ? redondear(value - anterior) : null;
  return (
    <article className="flex min-h-[118px] items-start justify-between rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p>
        {pendiente
          ? <p className="mt-2 text-sm font-semibold leading-none text-[#8a9290]">Pendiente de cálculo</p>
          : <p className="mt-2 text-xl font-bold leading-none text-[#252927]">{redondear(value)} <span className="text-sm">pts</span></p>}
        <p className="mt-3 text-[10px] text-[#8a9290]">{nombre}</p>
        {variacion !== null && (
          <span className={`mt-2 inline-flex items-center gap-0.5 text-[10px] font-bold ${variacion >= 0 ? 'text-[#3c8d66]' : 'text-[#a00046]'}`}>
            {variacion >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {variacion > 0 ? '+' : ''}{variacion} vs. semestre anterior
          </span>
        )}
      </div>
      <span className="rounded-lg bg-[#f5f7f7] p-2 text-[#b65a78]">{icon}</span>
    </article>
  );
}

function Panel({ titulo, nota, children, className = '' }) {
  return (
    <article className={`rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm ${className}`}>
      <h3 className="text-xs font-bold text-[#252927]">{titulo}</h3>
      {nota && <p className="mt-0.5 text-[10px] text-[#8a9290]">{nota}</p>}
      <div className="mt-3">{children}</div>
    </article>
  );
}

/* ───────────── Gráficos ───────────── */

// Etiqueta del eje Y que parte el texto largo en varias líneas (evita cortar "Predictibilidad de las políticas…").
function TickMultilinea({ x, y, payload }) {
  const lineas = [];
  let actual = '';
  String(payload.value).split(' ').forEach((palabra) => {
    if (`${actual} ${palabra}`.trim().length > 26) { lineas.push(actual); actual = palabra; } else actual = `${actual} ${palabra}`.trim();
  });
  if (actual) lineas.push(actual);
  return (
    <text x={x - 6} y={y} textAnchor="end" fontSize={9} fill="#59615e">
      {lineas.map((linea, i) => <tspan key={linea} x={x - 6} dy={i === 0 ? 3 - (lineas.length - 1) * 5.5 : 11}>{linea}</tspan>)}
    </text>
  );
}

// Opción única con pocas opciones: dona + leyenda con el porcentaje de cada una.
function Donut({ data }) {
  const filas = aConteo(data);
  if (!filas.length) return <SinDatos />;
  return (
    <div className="grid items-center gap-3 sm:grid-cols-2">
      <div className="h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filas} dataKey="valor" nameKey="etiqueta" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
              {filas.map((f, i) => <Cell key={f.etiqueta} fill={PALETA[i % PALETA.length]} />)}
            </Pie>
            <Tooltip {...chartTooltip} formatter={(v, nombre) => [`${redondear(v)}%`, nombre]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5">
        {filas.map((f, i) => (
          <li key={f.etiqueta} className="flex items-center gap-2 text-[11px] text-[#59615e]">
            <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETA[i % PALETA.length] }} />
            <span className="flex-1">{f.etiqueta}</span>
            <b className="text-[#252927]">{redondear(f.valor)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Opciones con orden natural (tamaño, frecuencia) o pocos factores en escala: columnas verticales.
function Columnas({ filas, escala = false }) {
  if (!filas.length) return <SinDatos />;
  const maximo = Math.max(...filas.map((f) => f.valor));
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 18, right: 4, left: -25, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef0f1" />
          <XAxis dataKey="etiqueta" tick={EJE} tickLine={false} axisLine={false} interval={0} />
          <YAxis
            domain={escala ? [0, 5] : [0, (max) => Math.min(100, Math.ceil((max + 8) / 10) * 10)]}
            tick={EJE} tickLine={false} axisLine={false}
            tickFormatter={(v) => (escala ? v : `${v}%`)}
          />
          <Tooltip {...chartTooltip} formatter={(v) => [escala ? `${redondear(v)} de 5` : `${redondear(v)}%`, escala ? 'Promedio' : 'Empresas']} />
          {escala && <ReferenceLine y={3} stroke="#d49b31" strokeDasharray="3 3" />}
          <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
            {filas.map((f) => <Cell key={f.etiqueta} fill={escala ? (f.valor < 3 ? '#a00046' : '#d092a6') : (f.valor === maximo ? '#a00046' : '#b65a78')} />)}
            <LabelList dataKey="valor" position="top" formatter={(v) => (escala ? redondear(v) : `${redondear(v)}%`)} style={ETIQUETA_VALOR} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Muchas opciones o etiquetas largas: barras horizontales (porcentajes o promedios de 1 a 5).
function BarrasH({ filas, escala = false, ordenar = false }) {
  if (!filas.length) return <SinDatos />;
  const datos = ordenar ? ordenado(filas) : filas;
  return (
    <div style={{ height: datos.length * 34 + 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#eef0f1" />
          <XAxis type="number" hide domain={escala ? [0, 5] : [0, (max) => Math.min(100, Math.ceil(max / 10) * 10)]} />
          <YAxis type="category" dataKey="etiqueta" width={150} tick={<TickMultilinea />} tickLine={false} axisLine={false} interval={0} />
          <Tooltip {...chartTooltip} formatter={(v) => [escala ? `${redondear(v)} de 5` : `${redondear(v)}%`, escala ? 'Promedio' : 'Empresas']} />
          {escala && <ReferenceLine x={3} stroke="#d49b31" strokeDasharray="3 3" />}
          <Bar dataKey="valor" radius={[0, 3, 3, 0]} barSize={16}>
            {datos.map((f, i) => <Cell key={f.etiqueta} fill={escala ? (f.valor < 3 ? '#a00046' : '#d092a6') : (ordenar && i === 0 ? '#a00046' : '#b65a78')} />)}
            <LabelList dataKey="valor" position="right" formatter={(v) => (escala ? redondear(v) : `${redondear(v)}%`)} style={ETIQUETA_VALOR} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Una sola cifra (porcentaje o promedio): medidor de media luna con el valor al centro.
function Gauge({ valor, max = 100, sufijo = '%', etiqueta }) {
  const sinDato = valor === null || valor === undefined;
  const v = sinDato ? 0 : Math.min(Number(valor), max);
  return (
    <div className="relative mx-auto h-[150px] w-full max-w-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[{ n: 'valor', v }, { n: 'resto', v: max - v }]} dataKey="v" startAngle={180} endAngle={0} cx="50%" cy="88%" innerRadius={72} outerRadius={100} stroke="none">
            <Cell fill="#a00046" />
            <Cell fill="#f0f2f2" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
        <p className="text-2xl font-bold leading-none text-[#a00046]">{sinDato ? '-' : redondear(valor)} {!sinDato && <span className="text-sm text-[#59615e]">{sufijo}</span>}</p>
        {etiqueta && <p className="mt-1 text-[10px] text-[#8a9290]">{etiqueta}</p>}
      </div>
    </div>
  );
}

// Varios factores en escala 1 a 5: radar con el mismo eje (0 a 5) en todos.
function RadarEscala({ filas }) {
  if (!filas.length) return <SinDatos />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={filas} outerRadius="62%">
          <PolarGrid stroke="#cfd5d4" />
          <PolarAngleAxis dataKey="etiqueta" tick={{ fontSize: 9, fill: '#59615e' }} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8, fill: '#8a9290' }} />
          <Radar name="Promedio" dataKey="valor" stroke="#a00046" fill="#a00046" fillOpacity={0.18} strokeWidth={2} />
          <Tooltip {...chartTooltip} formatter={(v) => [`${redondear(v)} de 5`, 'Promedio']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// PIB, inflación, tipo de cambio y exportaciones comparten las 5 opciones: una barra apilada al 100 % por variable.
function ExpectativasApiladas({ e = {} }) {
  const variables = [['PIB', e.pib], ['Inflación', e.inflacion], ['Tipo de cambio', e.tipoCambio], ['Exportaciones de su empresa', e.exportaciones]].filter(([, d]) => d?.length);
  if (!variables.length) return <SinDatos />;
  const filas = variables.map(([variable, d]) => Object.fromEntries([['variable', variable], ...d.map((item, i) => [`c${i}`, Number(item.porcentaje)])]));
  return (
    <>
      <div style={{ height: filas.length * 52 + 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap={10}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis type="category" dataKey="variable" width={120} tick={<TickMultilinea />} tickLine={false} axisLine={false} interval={0} />
            <Tooltip {...chartTooltip} formatter={(v, nombre) => [`${redondear(v)}%`, nombre]} />
            {EXPECTATIVAS.map((op, i) => (
              <Bar key={op.label} dataKey={`c${i}`} name={op.label} stackId="expectativa" fill={op.color} barSize={26}>
                <LabelList dataKey={`c${i}`} position="center" formatter={(v) => (v >= 8 ? `${Math.round(v)}%` : '')} style={{ fontSize: 10, fontWeight: 700, fill: op.texto }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-[#737b78]">
        {EXPECTATIVAS.map((op) => <li key={op.label}><i className="mr-1 inline-block h-2 w-2 rounded-sm border border-[#d7dcdb]" style={{ background: op.color }} />{op.label}</li>)}
      </ul>
    </>
  );
}

function SinDatos() {
  return <p className="text-xs text-[#8a9290]">Sin datos para esta pregunta.</p>;
}

function Aviso({ tono, children }) {
  const estilo = tono === 'error' ? 'bg-red-50 text-red-700' : 'border border-[#e2e6e8] bg-white text-[#6d7673]';
  return <p className={`flex items-center gap-2 rounded-lg px-4 py-5 text-sm ${estilo}`}>{tono === 'error' && <AlertCircle size={16} />}{children}</p>;
}