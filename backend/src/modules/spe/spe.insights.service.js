// backend/src/modules/spe/spe.insights.service.js
// Kevin Alanes — US36 (insights del SPE).
//
// Contrato: recibe lo que devuelve obtenerDashboardSpe (Liz) y devuelve los
// hallazgos clave para mostrar en el dashboard:
//   calcularInsightsSpe(datos) -> [{ tono: 'verde' | 'rojo' | 'dorado' | 'gris', texto: string }]

const NOMBRES_INDICES = {
  iee: "IEE (Expectativas)",
  ice: "ICE (Competitividad)",
  iie: "IIE (Internacionalización)",
  icie: "ICIE (Clima de Inversión)",
};

// Redondea a 1 decimal de forma segura (evita NaN/null).
function redondear(n) {
  return typeof n === "number" && !Number.isNaN(n)
    ? Math.round(n * 10) / 10
    : null;
}

// Formatea un porcentaje seguro.
function formatearPct(n) {
  return typeof n === "number" && !Number.isNaN(n) ? `${Math.round(n)}%` : null;
}

// 1. Índice que más subió / bajó frente al semestre anterior.
function insightVariacionIndices(datos) {
  const { indices, indicesAnterior } = datos;
  if (!indices || !indicesAnterior) return [];

  const variaciones = Object.keys(NOMBRES_INDICES)
    .map((clave) => {
      const actual = indices[clave];
      const anterior = indicesAnterior[clave];
      if (typeof actual !== "number" || typeof anterior !== "number")
        return null;
      return { clave, actual, anterior, delta: actual - anterior };
    })
    .filter(Boolean);

  if (!variaciones.length) return [];

  const masSubio = variaciones.reduce((a, b) => (b.delta > a.delta ? b : a));
  const masBajo = variaciones.reduce((a, b) => (b.delta < a.delta ? b : a));

  const insights = [];

  if (masSubio.delta > 0) {
    insights.push({
      tono: "verde",
      texto: `${NOMBRES_INDICES[masSubio.clave]} subió ${redondear(masSubio.delta)} pts frente al semestre anterior (${redondear(masSubio.anterior)} → ${redondear(masSubio.actual)}).`,
    });
  }

  if (masBajo.delta < 0) {
    insights.push({
      tono: "rojo",
      texto: `${NOMBRES_INDICES[masBajo.clave]} bajó ${redondear(Math.abs(masBajo.delta))} pts frente al semestre anterior (${redondear(masBajo.anterior)} → ${redondear(masBajo.actual)}).`,
    });
  }

  return insights;
}

// 2. Barrera principal más elegida.
function insightBarreraPrincipal(datos) {
  const barreras = datos?.secciones?.comercio?.barreraPrincipal;
  if (!Array.isArray(barreras) || !barreras.length) return [];

  const top = barreras.reduce((a, b) => (b.porcentaje > a.porcentaje ? b : a));
  const pct = formatearPct(top.porcentaje);
  if (!pct) return [];

  return [
    {
      tono: "dorado",
      texto: `La principal barrera para exportar es "${top.barrera}", elegida por el ${pct} de las empresas.`,
    },
  ];
}

// 3. % que realizará inversiones.
function insightInversiones(datos) {
  const inversion = datos?.secciones?.inversion;
  if (!inversion) return [];

  const pct = formatearPct(inversion.invertira);
  if (!pct) return [];

  const tono = inversion.invertira >= 50 ? "verde" : "gris";
  return [
    {
      tono,
      texto: `${pct} de las empresas planea realizar inversiones en los próximos 12 meses.`,
    },
  ];
}

// 4. Factor de competitividad peor evaluado (promedio más bajo, escala 1-5).
function insightPeorCompetitividad(datos) {
  const factores = datos?.secciones?.competitividad?.factores;
  if (!Array.isArray(factores) || !factores.length) return [];

  const validos = factores.filter((f) => typeof f.promedio === "number");
  if (!validos.length) return [];

  const peor = validos.reduce((a, b) => (b.promedio < a.promedio ? b : a));
  return [
    {
      tono: "rojo",
      texto: `El factor de competitividad peor evaluado es "${peor.factor}" (promedio ${redondear(peor.promedio)}/5).`,
    },
  ];
}

// 5. Sector exportador con más empresas (extra útil).
function insightSectorTop(datos) {
  const sectores = datos?.secciones?.caracterizacion?.sector;
  if (!Array.isArray(sectores) || !sectores.length) return [];

  const top = sectores.reduce((a, b) => (b.cantidad > a.cantidad ? b : a));
  const pct = formatearPct(top.porcentaje);
  if (!pct) return [];

  return [
    {
      tono: "gris",
      texto: `El sector exportador con más empresas encuestadas es "${top.opcion}" (${pct}).`,
    },
  ];
}

// 6. Total de empresas encuestadas (contexto).
function insightTotalEmpresas(datos) {
  if (typeof datos?.totalEmpresas !== "number" || datos.totalEmpresas === 0)
    return [];
  return [
    {
      tono: "gris",
      texto: `El análisis cubre ${datos.totalEmpresas} empresas exportadoras encuestadas.`,
    },
  ];
}

function calcularInsightsSpe(datos) {
  if (!datos) return [];

  return [
    ...insightTotalEmpresas(datos),
    ...insightVariacionIndices(datos),
    ...insightBarreraPrincipal(datos),
    ...insightInversiones(datos),
    ...insightPeorCompetitividad(datos),
    ...insightSectorTop(datos),
  ];
}

module.exports = { calcularInsightsSpe };
