import { useState } from 'react';
import { Filter } from 'lucide-react';

// Monserrat — US33 (filtros: período, departamento, sector exportador y tamaño).
//
// Props (las pasa SPEPage de Liz, no hace falta tocar esa página):
//   filtros:   objeto actual, ej. { year: 2026, semester: 1, department: 'La Paz', sector: 'Textiles', size: 'Mediana' }
//   onAplicar: (nuevosFiltros) => void — llámalo al presionar "Aplicar filtros"
//   opciones:  opcionesFiltros que devuelve GET /api/spe (períodos, departamentos, sectores, tamaños)
// El filtro por sector es el de US34 (Liz): coordinen si hace falta algo más.
const OPCIONES_POR_DEFECTO = {
  periodos: [
    { year: 2026, semester: 1 },
    { year: 2026, semester: 2 },
    { year: 2027, semester: 1 },
  ],

  departamentos: [
    'Santa Cruz',
    'La Paz',
    'Cochabamba',
  ],

  sectores: [
    'Agroindustria',
    'Alimentos',
    'Manufactura',
    'Software y Servicios',
    'Construcción',
    'Químico',
    'Textiles',
    'Otro',
  ],

  tamanos: [
    'Micro',
    'Pequeña',
    'Mediana',
    'Grande',
  ],
};

const CLASE_SELECT =
  'w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]';

export default function FiltrosSpe({ filtros, onAplicar, opciones }) { // eslint-disable-line no-unused-vars

  return (
    <section className="rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">

      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777f7c]">
        <Filter size={14} className="text-[#a00046]" />
        Filtros de consulta
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">

        {/* Período */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
            Período
          </span>

          <select className={CLASE_SELECT} defaultValue="">
            <option value="">Todos</option>

            {OPCIONES_POR_DEFECTO.periodos.map(({ year, semester }) => (
              <option
                key={`${year}-${semester}`}
                value={`${year}-${semester}`}
              >
                S{semester} {year}
              </option>
            ))}
          </select>
        </label>

        {/* Departamento */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
            Departamento
          </span>

          <select className={CLASE_SELECT} defaultValue="">
            <option value="">Todos</option>

            {OPCIONES_POR_DEFECTO.departamentos.map((departamento) => (
              <option key={departamento} value={departamento}>
                {departamento}
              </option>
            ))}
          </select>
        </label>

        {/* Sector exportador */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
            Sector exportador
          </span>

          <select className={CLASE_SELECT} defaultValue="">
            <option value="">Todos</option>

            {OPCIONES_POR_DEFECTO.sectores.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </label>

        {/* Tamaño de empresa */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
            Tamaño de empresa
          </span>

          <select className={CLASE_SELECT} defaultValue="">
            <option value="">Todos</option>

            {OPCIONES_POR_DEFECTO.tamanos.map((tamano) => (
              <option key={tamano} value={tamano}>
                {tamano}
              </option>
            ))}
          </select>
        </label>

        {/* Botón */}
        <button
          type="button"
          className="rounded-lg bg-[#252927] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#a00046]"
        >
          Aplicar filtros
        </button>

      </div>
    </section>
  );
}
