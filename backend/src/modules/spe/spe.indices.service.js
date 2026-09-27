// Liz — US63 (cálculo de índices SOCOMEX/SOCIFIN).
//
// Contrato: lo llama la aprobación de Monserrat (spe.aprobacion) cuando una
// carga pasa a APROBADA:
//   await calcularIndicesSpe(dataLoadId)
// Por cada fila de spe_survey_response de esa carga, guarda sus 4 índices en
// spe_index_score (iee, ice, iie, icie). El dashboard luego los promedia.
// BLOQUEADO: las fórmulas de IEE, ICE, IIE e ICIE las tiene que confirmar el cliente.
async function calcularIndicesSpe(dataLoadId) {
  // Sin fórmulas todavía: no hace nada, así la aprobación ya puede llamarla.
}

module.exports = { calcularIndicesSpe };
