/**
 * Recuadro temporal para una PARTE de una pantalla que todavía no se
 * construyó (ej. los filtros dentro del dashboard SPE). Para una pantalla
 * entera usa PlaceholderPage.
 */
export default function BloquePendiente({ texto, historia, encargado }) {
  return (
    <div className="rounded-xl border border-dashed border-brand/30 bg-card px-4 py-5 text-center text-xs text-ink/50">
      <span className="font-semibold text-ink/70">{texto}</span>
      <span className="ml-2 rounded-full bg-maroon/10 px-2 py-0.5 font-semibold text-brand">
        {historia} · {encargado}
      </span>
    </div>
  );
}
