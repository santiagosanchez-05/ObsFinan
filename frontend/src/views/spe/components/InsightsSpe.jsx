// frontend/src/views/spe/components/InsightsSpe.jsx
// Kevin Alanes — US36 (insights del SPE).
//
// Props: insights = [{ tono: 'verde' | 'rojo' | 'dorado' | 'gris', texto }]
// Mismo estilo visual que los hallazgos del dashboard ICA.
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";

const TONOS = {
  rojo: {
    clase: "border-brand text-brand",
    icono: <ArrowDownRight size={14} />,
  },
  verde: {
    clase: "border-[#7cbb9a] text-[#3c8d66]",
    icono: <ArrowUpRight size={14} />,
  },
  dorado: {
    clase: "border-[#d49b31] text-[#b77d18]",
    icono: <Info size={14} />,
  },
  gris: { clase: "border-muted text-muted", icono: <Info size={14} /> },
};

function Finding({ tono, texto }) {
  const { clase, icono } = TONOS[tono] ?? TONOS.gris;
  return (
    <div
      className={`rounded-lg border-l-2 bg-card px-3 py-3 text-[10px] leading-relaxed text-ink-2 shadow-sm ${clase}`}
    >
      <span className="mr-1 inline-flex align-middle">{icono}</span>
      {texto}
    </div>
  );
}

export default function InsightsSpe({ insights = [] }) {
  if (!insights.length) {
    return (
      <section className="mb-5">
        <h2 className="mb-3 text-sm font-bold text-ink">
          Hallazgos clave del período
        </h2>
        <p className="rounded-lg border border-line bg-card px-4 py-5 text-sm text-muted">
          No hay hallazgos disponibles para el período seleccionado.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-sm font-bold text-ink">
        Hallazgos clave del período
      </h2>
      <div className="grid gap-3 lg:grid-cols-4">
        {insights.map((insight, index) => (
          <Finding key={index} tono={insight.tono} texto={insight.texto} />
        ))}
      </div>
    </section>
  );
}
