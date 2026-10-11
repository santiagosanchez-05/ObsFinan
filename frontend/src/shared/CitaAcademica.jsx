import { useEffect, useState } from 'react';
import { Check, Copy, Quote } from 'lucide-react';

// Cita académica (APA 7) del observatorio y de sus conjuntos de datos.
// Uso: <CitaAcademica recurso="observatorio" | "ica" | "spe" />
const AUTOR = 'Observatorio de Bienestar Financiero Univalle';
const EDITOR = 'Universidad Privada del Valle';

const RECURSOS = {
  observatorio: { titulo: 'Observatorio de Bienestar Financiero Univalle', ruta: '/', tipo: null },
  ica: { titulo: 'Índice de Calidad Aseguradora (ICA)', ruta: '/ica', tipo: 'Conjunto de datos' },
  spe: {
    titulo: 'Encuesta Única Integrada del Sector Privado Exportador SOCOMEX–SOCIFIN',
    ruta: '/spe',
    tipo: 'Conjunto de datos',
  },
};

function armarCita(recurso, { origen = window.location.origin, hoy = new Date() } = {}) {
  const { titulo, ruta, tipo } = RECURSOS[recurso] ?? RECURSOS.observatorio;
  const anio = hoy.getFullYear();
  const fechaConsulta = hoy.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  const url = `${origen}${ruta}`;
  // Solo el título va en cursiva; la descripción entre corchetes no.
  // Las páginas del sitio cambian con el tiempo: APA pide la fecha de consulta.
  return {
    autor: `${AUTOR}. (${anio}). `,
    titulo,
    resto: `${tipo ? ` [${tipo}]` : ''}. ${EDITOR}. Recuperado el ${fechaConsulta}, de ${url}`,
  };
}

// Respaldo para navegadores que bloquean navigator.clipboard (permisos, http).
function copiarConTextarea(texto) {
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let copiado = false;
  try {
    copiado = document.execCommand('copy');
  } catch {
    copiado = false;
  }
  document.body.removeChild(area);
  return copiado;
}

export default function CitaAcademica({ recurso = 'observatorio', className = '' }) {
  const [estado, setEstado] = useState('inicial'); // inicial | copiada | error
  const cita = armarCita(recurso);
  const texto = `${cita.autor}${cita.titulo}${cita.resto}`;

  useEffect(() => {
    if (estado !== 'copiada') return undefined;
    const t = setTimeout(() => setEstado('inicial'), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado('copiada');
    } catch {
      setEstado(copiarConTextarea(texto) ? 'copiada' : 'error');
    }
  }

  return (
    <section className={`rounded-2xl border border-line bg-card p-5 text-left shadow-sm ${className}`} aria-label="Cómo citar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-maroon/10">
            <Quote size={16} className="text-brand" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Cómo citar (APA 7)</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink/70" data-testid="texto-cita">
              {cita.autor}
              <em>{cita.titulo}</em>
              {cita.resto}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:border-brand hover:text-brand"
        >
          {estado === 'copiada' ? <Check size={15} className="text-green-600 dark:text-green-400" /> : <Copy size={15} />}
          {estado === 'copiada' ? '¡Cita copiada!' : 'Copiar cita'}
        </button>
      </div>
      {estado === 'error' && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.
        </p>
      )}
    </section>
  );
}
