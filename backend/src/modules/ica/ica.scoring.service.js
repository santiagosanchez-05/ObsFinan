// Liz — US60 (cálculo automático del ICA al aprobar una encuesta).
//
const { recalcularAgregadoManual } = require('./ica.service');

// Contrato: la aprobación de Monserrat (ica.aprobacion) llama este servicio
// cuando una carga pasa a APROBADA:
//   await recalcularAgregadoIca({ communityId, year, quarter })
// La fórmula adoptada normaliza cada respuesta según el orden de opciones del
// instrumento a 0-100, promedia las preguntas de cada dimensión y luego
// agrega por comuna, año, trimestre y sexo.
async function recalcularAgregadoIca({
  conexion,
  communityId,
  year,
  quarter,
  dataLoadId,
} = {}) {
  if (!conexion) {
    throw new Error('CONEXION_REQUERIDA');
  }
  if (![communityId, year, quarter, dataLoadId].every((valor) => Number.isInteger(Number(valor)) && Number(valor) > 0)) {
    throw new Error('PARAMETROS_ICA_INVALIDOS');
  }

  return recalcularAgregadoManual({
    conexion,
    communityId: Number(communityId),
    year: Number(year),
    quarter: Number(quarter),
    dataLoadId: Number(dataLoadId),
  });
}

module.exports = { recalcularAgregadoIca };
