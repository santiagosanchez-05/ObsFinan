// Modo oscuro: la elección del usuario se guarda en el navegador y se aplica
// con la clase `dark` en <html>. index.html la aplica antes de pintar la
// página (sin destello blanco); esto la cambia después.
export const CLAVE_TEMA = 'bfu_tema';
const EVENTO = 'bfu-tema';

export function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'oscuro');
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin acceso al almacenamiento (modo privado): el tema dura hasta recargar.
  }
  window.dispatchEvent(new Event(EVENTO));
}

// Para useSyncExternalStore: todos los botones (desktop y mobile) leen lo mismo.
export const esOscuro = () => document.documentElement.classList.contains('dark');
export function suscribirTema(avisar) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}
