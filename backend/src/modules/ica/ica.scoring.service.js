// Liz — US60 (cálculo automático del ICA al aprobar una encuesta).
//
// Contrato: lo llama la aprobación de Monserrat (ica.aprobacion) cuando una
// carga pasa a APROBADA:
//   await recalcularAgregadoIca({ communityId, year, quarter })
// Debe recalcular los índices por encuestado a partir de ica_survey_response
// (solo cargas APROBADAS) y hacer upsert de la fila agregada en
// ica_measurement (ver el comentario "🔒 recalcularAgregado" en ica.service.js).
// BLOQUEADO: falta la tabla de puntajes por pregunta del cliente.
async function recalcularAgregadoIca({ communityId, year, quarter } = {}) {
  // Sin tabla de puntajes todavía: no hace nada, así la aprobación ya puede llamarla.
}

module.exports = { recalcularAgregadoIca };
