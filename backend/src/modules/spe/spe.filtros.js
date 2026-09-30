// Monserrat — US33 (filtros del dashboard SPE).
//
// Contrato: recibe req.query y devuelve los filtros ya validados que usa
// obtenerDashboardSpe (Liz). Los valores de departamento, sector y tamaño son
// exactamente los ENUM de spe_survey_response (s1_department, s1_export_sector,
// s1_company_size). Liz usa `sector` para US34.
//   parsearFiltrosSpe({ year: '2026', semester: '1', department: 'La Paz',
//                       sector: 'Textiles', size: 'Mediana' })
//     -> { year: 2026, semester: 1, department: 'La Paz', sector: 'Textiles', size: 'Mediana' }
// Lo que no venga o sea inválido, no se incluye (= sin filtro).
const DEPARTAMENTOS = ['Santa Cruz', 'La Paz', 'Cochabamba'];
const SECTORES = ['Agroindustria', 'Alimentos', 'Manufactura', 'Software y Servicios', 'Construcción', 'Químico', 'Textiles', 'Otro'];
const TAMANOS = ['Micro', 'Pequeña', 'Mediana', 'Grande'];
 
// Un query param repetido (?year=1&year=2) llega como arreglo y uno anidado como objeto: solo se acepta texto.
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : undefined;
}
 
function entero(valor, minimo, maximo) {
  const t = texto(valor);
  if (!t || !/^\d+$/.test(t)) return undefined;
  const n = Number(t);
  return n >= minimo && n <= maximo ? n : undefined;
}
 
function opcion(valor, permitidos) {
  const t = texto(valor);
  return permitidos.includes(t) ? t : undefined;
}
 
function parsearFiltrosSpe(query = {}) {
  const q = query ?? {};
  const candidatos = {
    year: entero(q.year, 2000, 2100),
    semester: entero(q.semester, 1, 2),
    department: opcion(q.department, DEPARTAMENTOS),
    sector: opcion(q.sector, SECTORES),
    size: opcion(q.size, TAMANOS),
  };
  return Object.fromEntries(Object.entries(candidatos).filter(([, valor]) => valor !== undefined));
}
 
module.exports = { parsearFiltrosSpe };