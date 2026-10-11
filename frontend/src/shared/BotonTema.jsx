import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { aplicarTema, esOscuro, suscribirTema } from './tema';

// Botón sol/luna de los headers (logueado y visitante).
export default function BotonTema({ className = '' }) {
  const oscuro = useSyncExternalStore(suscribirTema, esOscuro);

  return (
    <button
      type="button"
      onClick={() => aplicarTema(oscuro ? 'claro' : 'oscuro')}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={oscuro}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      className={`shrink-0 rounded-full p-2 text-ink/70 transition hover:bg-ink/5 hover:text-ink ${className}`}
    >
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
