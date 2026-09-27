// Liz — US63 (cálculo de índices SOCOMEX/SOCIFIN).
//
// Contrato: lo llama la aprobación de Monserrat (spe.aprobacion) cuando una
// carga pasa a APROBADA:
//   await calcularIndicesSpe(dataLoadId)
// BLOQUEADO: las fórmulas de IEE, ICE, IIE e ICIE las tiene que confirmar el cliente.
async function calcularIndicesSpe(dataLoadId) {
  // Sin fórmulas todavía: no hace nada, así la aprobación ya puede llamarla.
}

module.exports = { calcularIndicesSpe };
