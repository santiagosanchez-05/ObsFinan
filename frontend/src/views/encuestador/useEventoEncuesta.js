import { useEffect, useState } from 'react';

// Período de la encuesta según la fecha del evento ("2026-10-15").
// El backend calcula lo mismo; acá es solo para mostrarlo.
export function periodoDelEvento(fecha) {
  if (!fecha) return null;
  const [year, mes] = fecha.split('-').map(Number);
  return { year, quarter: Math.ceil(mes / 3), semester: mes <= 6 ? 1 : 2 };
}

// Carga el evento desde el que el encuestador registra una encuesta (ICA o SPE).
export function useEventoEncuesta(eventId) {
  const [estado, setEstado] = useState({ evento: null, cargando: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      try {
        const res = await fetch(`/api/events/${eventId}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el evento');
        setEstado({ evento: data, cargando: false, error: '' });
      } catch (err) {
        if (err.name !== 'AbortError') setEstado({ evento: null, cargando: false, error: err.message });
      }
    }
    cargar();
    return () => controller.abort();
  }, [eventId]);

  return estado;
}
