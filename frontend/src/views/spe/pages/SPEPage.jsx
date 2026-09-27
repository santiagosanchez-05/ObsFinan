import { useState } from 'react';
import BloquePendiente from '../../../shared/BloquePendiente';
import FiltrosSpe from '../components/FiltrosSpe';
import InsightsSpe from '../components/InsightsSpe';
import ExportarSpe from '../components/ExportarSpe';

// Liz — US35 (dashboard) y US34 (sector exportador). Página pública.
//
// La página ya está armada con las piezas de cada encargado, cada una en su
// propio archivo de components/ (así nadie pisa a nadie):
//   <FiltrosSpe />  Monserrat (US33)   <InsightsSpe /> Kevin Alanes (US36)
//   <ExportarSpe /> Kevin Prieto (US40)
// Liz: haz aquí el fetch a GET /api/spe con `filtros` y reemplaza el
// BloquePendiente por los gráficos (4 índices IEE, ICE, IIE, ICIE y una vista
// por sección de la encuesta). `datos.insights` va a <InsightsSpe />.
export default function SPEPage() {
  const [filtros, setFiltros] = useState({});
  const datos = null; // respuesta de GET /api/spe (US35)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">Módulo SPE</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Sector Privado Exportador</h1>
            <p className="mt-1 text-sm text-ink/60">Encuesta semestral SOCOMEX–SOCIFIN a empresas exportadoras bolivianas</p>
          </div>
          <ExportarSpe filtros={filtros} />
        </div>

        <FiltrosSpe filtros={filtros} onAplicar={setFiltros} opciones={datos?.opcionesFiltros} />

        <BloquePendiente texto="Dashboard SPE: índices IEE, ICE, IIE, ICIE y gráficos por sección" historia="US35" encargado="Liz" />

        <InsightsSpe insights={datos?.insights ?? []} />
      </div>
    </main>
  );
}
