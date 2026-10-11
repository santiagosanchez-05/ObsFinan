import { useState } from 'react';
import { Filter } from 'lucide-react';

// Monserrat — US33. Filtros del dashboard SPE. Estilo igual al de los filtros de ICAPage.
// Props: filtros (los aplicados), onAplicar(filtros) y opciones (datos.opcionesFiltros de GET /api/spe).
// Claves del objeto de filtros, que son también los query params que lee parsearFiltrosSpe:
//   year, semester, department, sector, size    ('' = todos)

const VACIO = { year: '', semester: '', department: '', sector: '', size: '' };

// Solo mientras `opciones` no llega del backend: opciones del Word para que los selects no salgan vacíos.
const OPCIONES_POR_DEFECTO = {
  periodos: [{ year: 2026, semester: 1 }, { year: 2026, semester: 2 }, { year: 2027, semester: 1 }],
  departamentos: ['Santa Cruz', 'La Paz', 'Cochabamba'],
  sectores: ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'],
  tamanos: ['Micro', 'Pequeña', 'Mediana', 'Grande'],
};

// El semestre es siempre 1 o 2, no depende de lo que haya en la base.
const SEMESTRES = [1, 2];

const CLASE_SELECT = 'w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2 outline-none focus:border-brand';

// Las opciones pueden llegar como texto ('La Paz') o como { value, label }.
const valorDe = (opcion) => (typeof opcion === 'object' ? String(opcion.value ?? opcion.id ?? opcion.nombre) : String(opcion));
const etiquetaDe = (opcion) => (typeof opcion === 'object' ? String(opcion.label ?? opcion.nombre ?? opcion.value) : String(opcion));

export default function FiltrosSpe({ filtros = {}, onAplicar, opciones }) {
  const [borrador, setBorrador] = useState({ ...VACIO, ...filtros });
  const lista = (clave) => opciones?.[clave] ?? OPCIONES_POR_DEFECTO[clave];
  const cambiar = (campo) => (evento) => setBorrador((actual) => ({ ...actual, [campo]: evento.target.value }));

  // Los años salen de los períodos que hay en la base: una opción por año, no una por semestre.
  // Si el backend manda `anios` directamente, se usa tal cual.
  const anios = opciones?.anios ?? [...new Set(lista('periodos').map(({ year }) => Number(year)))].sort((a, b) => b - a);

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <Filter size={14} className="text-brand" /> Filtros de consulta
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,1fr)_auto]">
        <Campo etiqueta="Año" value={borrador.year} onChange={cambiar('year')}>
          {anios.map((year) => <option key={year} value={year}>{year}</option>)}
        </Campo>

        <Campo etiqueta="Semestre" value={borrador.semester} onChange={cambiar('semester')}>
          {SEMESTRES.map((semestre) => <option key={semestre} value={semestre}>Semestre {semestre}</option>)}
        </Campo>

        <Campo etiqueta="Departamento" value={borrador.department} onChange={cambiar('department')}>
          {lista('departamentos').map((o) => <option key={valorDe(o)} value={valorDe(o)}>{etiquetaDe(o)}</option>)}
        </Campo>

        <Campo etiqueta="Sector exportador" value={borrador.sector} onChange={cambiar('sector')}>
          {lista('sectores').map((o) => <option key={valorDe(o)} value={valorDe(o)}>{etiquetaDe(o)}</option>)}
        </Campo>

        <Campo etiqueta="Tamaño de empresa" value={borrador.size} onChange={cambiar('size')}>
          {lista('tamanos').map((o) => <option key={valorDe(o)} value={valorDe(o)}>{etiquetaDe(o)}</option>)}
        </Campo>

        <button
          type="button"
          onClick={() => onAplicar?.(borrador)}
          className="rounded-lg bg-night px-5 py-2 text-sm font-semibold text-white transition hover:bg-maroon"
        >
          Aplicar filtros
        </button>
      </div>
    </section>
  );
}

function Campo({ etiqueta, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{etiqueta}</span>
      <select value={value} onChange={onChange} className={CLASE_SELECT}>
        <option value="">Todos</option>
        {children}
      </select>
    </label>
  );
}