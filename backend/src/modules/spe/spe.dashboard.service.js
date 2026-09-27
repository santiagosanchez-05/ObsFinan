// Liz — US35 (dashboard) y US34 (filtro por sector exportador).
//
// Encuesta: ENCUESTA ÚNICA INTEGRADA SOCOMEX–SOCIFIN (8 secciones).
// Tablas: spe_survey_response (una fila por empresa) + spe_index_score (sus 4 índices).
//
// Contrato (lo usan el controlador del dashboard y los insights de Kevin Alanes):
//   obtenerDashboardSpe(filtros) -> {
//     periodo: { year, semester } | null,
//     totalEmpresas: number,
//     indices: { iee, ice, iie, icie },          // promedio de spe_index_score (null mientras no haya fórmulas, US63)
//     indicesAnterior: { iee, ice, iie, icie } | null,   // mismo cálculo del semestre anterior (para variaciones)
//     secciones: {
//       caracterizacion:     { departamento: [...], sector: [...], tamano: [...], destino: [...] },   // conteo por opción
//       expectativas:        { pib: [...], inflacion: [...], tipoCambio: [...], exportaciones: [...], situacion: {...} },
//       internacionalizacion: { nuevosMercados: %, prioridadPromedio, frecuencia: [...], modalidad: [...] },
//       competitividad:      { factores: [{ factor, promedio }], certificaciones: [{ certificacion, porcentaje }] },
//       comercio:            { barreraPrincipal: [{ barrera, porcentaje }], logistica: [{ factor, promedio }] },
//       financiero:          { factores: [{ factor, promedio }], instrumentos: [...], regulaciones: [...] },
//       institucional:       { factores: [{ factor, promedio }], medidaMayorImpacto: [...] },
//       inversion:           { invirtio: %, invertira: %, factores: [{ factor, promedio }] },
//     },
//     opcionesFiltros: { periodos: [...], departamentos: [...], sectores: [...], tamanos: [...] },
//   }
// Conteos: [{ opcion, cantidad, porcentaje }]. Escalas 1–5: promedio.
// Solo cuentan encuestas aprobadas: data_load.status = ESTADO_CARGA.APROBADA (config/estados.js).
async function obtenerDashboardSpe(filtros) {
  throw new Error('PENDIENTE: US35 (Liz)');
}

module.exports = { obtenerDashboardSpe };
