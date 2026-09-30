import { useState } from 'react';
import { Filter } from 'lucide-react';
const VACIO = { year: '', semester: '', department: '', sector: '', size: '' };
 
// Solo mientras `opciones` no llega del backend: opciones del Word para que los selects no salgan vacíos.
const OPCIONES_POR_DEFECTO = {
  periodos: [{ year: 2026, semester: 1 }, { year: 2026, semester: 2 }, { year: 2027, semester: 1 }],
  departamentos: ['Santa Cruz', 'La Paz', 'Cochabamba'],
  sectores: ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'],
  tamanos: ['Micro', 'Pequeña', 'Mediana', 'Grande'],
};
 
const CLASE_SELECT = 'w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]';
 
// Las opciones pueden llegar como texto ('La Paz') o como { value, label }.
const valorDe = (opcion) => (typeof opcion === 'object' ? String(opcion.value ?? opcion.id ?? opcion.nombre) : String(opcion));
const etiquetaDe = (opcion) => (typeof opcion === 'object' ? String(opcion.label ?? opcion.nombre ?? opcion.value) : String(opcion));
 
export default function FiltrosSpe({ filtros = {}, onAplicar, opciones }) {
  const [borrador, setBorrador] = useState({ ...VACIO, ...filtros });
  const lista = (clave) => opciones?.[clave] ?? OPCIONES_POR_DEFECTO[clave];
  const cambiar = (campo) => (evento) => setBorrador((actual) => ({ ...actual, [campo]: evento.target.value }));
 
  // El período junta año y semestre en un solo select ("S1 2026").
  const periodoValor = borrador.year && borrador.semester ? `${borrador.year}-${borrador.semester}` : '';
  function cambiarPeriodo(evento) {
    const [year = '', semester = ''] = evento.target.value.split('-');
    setBorrador((actual) => ({ ...actual, year, semester }));
  }
 
  return (
    <section className="rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777f7c]">
        <Filter size={14} className="text-[#a00046]" /> Filtros de consulta
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Campo etiqueta="Período" value={periodoValor} onChange={cambiarPeriodo}>
          {lista('periodos').map(({ year, semester }) => (
            <option key={`${year}-${semester}`} value={`${year}-${semester}`}>S{semester} {year}</option>
          ))}
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
          className="rounded-lg bg-[#252927] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a00046]"
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
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{etiqueta}</span>
      <select value={value} onChange={onChange} className={CLASE_SELECT}>
        <option value="">Todos</option>
        {children}
      </select>
    </label>
  );
}