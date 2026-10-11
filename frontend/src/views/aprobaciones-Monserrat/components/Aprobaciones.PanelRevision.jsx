import { SquarePen, X, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Secciones de la Encuesta Única Integrada SOCOMEX – SOCIFIN
// (el orden de las llaves define el orden en que se muestran)
// ---------------------------------------------------------------------------

export const SECCIONES_SPE = {
  I: 'Caracterización empresarial',
  II: 'Situación económica y expectativas',
  III: 'Internacionalización',
  IV: 'Competitividad exportadora',
  V: 'Comercio internacional y acceso a mercados',
  VI: 'Condiciones financieras',
  VII: 'Entorno institucional',
  VIII: 'Inversión y perspectiva futura',
};

const ORDEN_SECCIONES = Object.keys(SECCIONES_SPE);

/*
 * Valores especiales de una respuesta:
 *  - null / undefined / ''  -> "Sin responder" (debió responderse)
 *  - NO_APLICA              -> "No aplica" (la pregunta se salta por una
 *                              respuesta anterior; no cuenta como vacía)
 *  - ['a', 'b']             -> varias opciones marcadas
 */
export const NO_APLICA = '__no_aplica__';

const sinResponder = (valor) =>
  valor === null || valor === undefined || valor === '';


function codigoSeccion(g) {
  if (g.seccion) return g.seccion;

  const m = /^\s*(\d+)\s*[.)-]/.exec(g.grupo ?? '');

  return m ? ORDEN_SECCIONES[Number(m[1]) - 1] ?? null : null;
}

function porOrdenDeSeccion(a, b) {
  const ia = ORDEN_SECCIONES.indexOf(a.seccion);
  const ib = ORDEN_SECCIONES.indexOf(b.seccion);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}



function Dato({ label, children, wide = false }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-[9px] font-bold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

/* Valor de una respuesta: texto, varias opciones, "No aplica" o "Sin responder" */
function Respuesta({ valor }) {
  if (valor === NO_APLICA) {
    return <span className="font-normal italic text-muted">No aplica</span>;
  }

  if (sinResponder(valor)) {
    return <span className="text-[#b7891e]">Sin responder</span>;
  }

  if (Array.isArray(valor)) return valor.join(', ');

  return valor;
}

/* Encabezado de sección, igual que el Word: "II: Situación económica y expectativas" */
function EncabezadoSeccion({ codigo, titulo }) {
  return (
    <h3 className="mb-3 border-b border-line pb-2 text-xs font-bold text-ink">
      {codigo && <span className="text-brand">{codigo}: </span>}
      {titulo}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Contenido según tipo de registro
// ---------------------------------------------------------------------------

/*
 * Registro manual.
 * SPE -> respuestas: [{ grupo, items: [[pregunta, respuesta], ...] }]
 *        (el título de cada sección sale de SECCIONES_SPE: "II: ...")
 * ICA -> respuestas: [{ grupo: 'Perfil', items: [[pregunta, respuesta], ...] }]
 *        (títulos planos, sin números romanos)
 */
function RespuestasManual({ respuestas, sistema }) {
  const esSpe = sistema === 'spe';

  const lista = (respuestas ?? []).map((g) => ({
    ...g,
    seccion: esSpe ? codigoSeccion(g) : null,
  }));

  if (esSpe) lista.sort(porOrdenDeSeccion);

  // Preguntas que debieron responderse y están vacías (no cuenta "No aplica")
  const pendientes = lista.flatMap((g) =>
    (g.items ?? []).filter(([, r]) => sinResponder(r)).map(([p]) => p),
  );

  return (
    <>
      {pendientes.length > 0 && (
        <div className="rounded-lg border border-[#f3dfb4] bg-[#fbf1de] dark:bg-white/10 p-3">
          <p className="mb-1 text-xs font-bold text-[#b7891e]">
            Revisar antes de aprobar
          </p>
          <p className="mb-1 text-xs text-[#8a6a16]">
            {pendientes.length === 1
              ? '1 pregunta sin responder:'
              : `${pendientes.length} preguntas sin responder:`}
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-[#8a6a16]">
            {pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {lista.map((g) => {
        const codigo = g.seccion;
        const titulo = codigo ? SECCIONES_SPE[codigo] ?? g.grupo : g.grupo;

        return (
          <section key={codigo ?? g.grupo}>
            <EncabezadoSeccion codigo={codigo} titulo={titulo} />

            <dl className="divide-y divide-line rounded-lg border border-line">
              {g.items?.map(([pregunta, respuesta]) => (
                <div key={pregunta} className="px-3 py-2">
                  <dt className="text-[11px] text-muted">{pregunta}</dt>
                  <dd className="text-xs font-semibold text-ink">
                    <Respuesta valor={respuesta} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Botones del footer
// ---------------------------------------------------------------------------

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1';

function AccionesPanel({ onAprobar, onRechazar, disabled = false }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onRechazar}
        disabled={disabled}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card px-4 text-xs font-semibold text-ink/70 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`}
      >
        <X size={14} strokeWidth={2.5} />
        Rechazar
      </button>

      <button
        type="button"
        onClick={onAprobar}
        disabled={disabled}
        className={`inline-flex h-10 items-center gap-2 rounded-lg bg-maroon px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-maroon-light disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`}
      >
        <Check size={14} strokeWidth={2.5} />
        Aprobar carga
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function PanelRevision({
  registro: r,
  onClose,
  onAccion,
  procesando = false,
  sistema = 'spe',
}) {
  const zonas = r.zonas ?? [];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Revisión de carga"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3ecfb] dark:bg-white/10 text-[#7c4dbd] dark:text-[#b79be8]">
              <SquarePen size={15} />
            </span>

            <div>
              <h2 className="text-sm font-bold text-ink">{r.origen}</h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#7c4dbd] dark:text-[#b79be8]">Manual</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-muted hover:bg-surface hover:text-brand"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato label="Encuestador">
              {r.encuestador}
              {sistema === 'spe' && r.departamento && r.departamento !== '-' && (
                <span className="mt-0.5 block text-[10px] font-normal text-muted">
                  Encuesta en {r.departamento}
                </span>
              )}
            </Dato>
            <Dato label="Sede">{r.sede}</Dato>
            <Dato label="Periodo">{r.periodo}</Dato>
            <Dato label="Fecha de carga">
              {r.fecha
                ? new Date(r.fecha).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '-'}
            </Dato>
            <Dato label="Evento">{r.evento}</Dato>
            <Dato label="Encuestas">{r.registros}</Dato>
            {sistema === 'ica' && (
              <Dato label={zonas.length > 1 ? 'Comunas' : 'Comuna'} wide>
                {zonas.length ? zonas.join(', ') : '-'}
              </Dato>
            )}
          </dl>

          <RespuestasManual respuestas={r.respuestas} sistema={sistema} />
        </div>

        <footer className="border-t border-line px-5 py-3">
          <AccionesPanel
            disabled={procesando}
            onRechazar={() => onAccion(r, 'rechazar')}
            onAprobar={() => onAccion(r, 'aprobar')}
          />
        </footer>
      </aside>
    </div>
  );
}