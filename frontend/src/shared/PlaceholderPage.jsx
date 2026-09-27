import { Construction } from 'lucide-react';

/**
 * Pantalla vacía temporal para un módulo que todavía no se construyó.
 * El nav/login ya funcionan de verdad — esto es solo el contenido interno.
 * `historia` y `encargado` (opcionales) dicen de quién es la pantalla.
 */
export default function PlaceholderPage({ titulo, historia, encargado }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <Construction size={32} className="text-maroon" />
      <h1 className="mt-4 text-2xl font-bold text-ink">{titulo}</h1>
      <p className="mt-2 text-sm text-ink/60">Esta pantalla todavía no está construida.</p>
      {historia && (
        <p className="mt-3 rounded-full bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon">
          {historia}
          {encargado && ` · ${encargado}`}
        </p>
      )}
    </div>
  );
}
