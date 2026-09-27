// Andamiaje de Sprint 2: los endpoints que todavía nadie implementó responden
// 501 diciendo qué historia es y de quién. Cuando implementes la tuya,
// reemplazá `pendiente('USxx', 'Nombre')` por tu función (async (req, res) => {...}).
function pendiente(historia, encargado) {
  return (req, res) => res.status(501).json({ error: `Pendiente: ${historia} (${encargado})` });
}

module.exports = pendiente;
