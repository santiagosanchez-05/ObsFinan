// frontend/src/views/spe/components/InsightsSpe.jsx
// Kevin Alanes — US36 (insights del SPE).
//
// Props: insights = [{ tono: 'verde' | 'rojo' | 'dorado' | 'gris', texto }]
// Mismo estilo visual que los hallazgos del dashboard ICA.
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";

const TONOS = {
  rojo: {
    clase: "border-[#a00046] text-[#a00046]",
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
  gris: { clase: "border-[#aeb8b5] text-[#78827f]", icono: <Info size={14} /> },
};

function Finding({ tono, texto }) {
  const { clase, icono } = TONOS[tono] ?? TONOS.gris;
  return (
    <div
      className={`rounded-lg border-l-2 bg-white px-3 py-3 text-[10px] leading-relaxed text-[#59615e] shadow-sm ${clase}`}
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
        <h2 className="mb-3 text-sm font-bold text-[#252927]">
          Hallazgos clave del período
        </h2>
        <p className="rounded-lg border border-[#e2e6e8] bg-white px-4 py-5 text-sm text-[#6d7673]">
          No hay hallazgos disponibles para el período seleccionado.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-sm font-bold text-[#252927]">
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
