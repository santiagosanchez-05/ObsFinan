// Utilidades compartidas por las pantallas de eventos (Santiago).

export const MODALIDADES = [
  { valor: 1, nombre: 'Presencial' },
  { valor: 2, nombre: 'Virtual' },
  { valor: 3, nombre: 'Híbrido' },
];

// Sin sesión no se manda el header Authorization (los endpoints públicos usan optionalAuth).
export function headersDe(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// "2026-10-15" -> "jueves, 15 de octubre de 2026" (sin desfase de zona horaria).
export function formatearFecha(fecha, opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!fecha) return '';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString('es-BO', opciones);
  // Solo la primera letra en mayúscula: "Viernes, 16 de octubre de 2026".
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function partesFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return {
    dia: String(dia),
    mes: d.toLocaleDateString('es-BO', { month: 'short' }).replace('.', ''),
  };
}

// Hoy en el navegador, en formato AAAA-MM-DD (para el `min` del campo fecha).
export function hoyIso(ahora = new Date()) {
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Mismo criterio que el backend: el Superadmin gestiona cualquier sede, el Admin solo la suya.
export function puedeGestionarEvento(user, evento) {
  if (!user || !evento) return false;
  if (user.role === 'superadmin') return true;
  return user.role === 'admin' && Number(user.campusId) === Number(evento.campusId);
}
