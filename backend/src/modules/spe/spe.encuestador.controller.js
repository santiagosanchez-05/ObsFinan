// Kevin Alanes — US66 (el encuestador registra una encuesta SPE en un evento
// asignado; entra PENDIENTE hasta que el Superadmin la apruebe).
const { encuestaSpeSchema } = require('./spe.registro.validation');
const speEncuestadorService = require('./spe.encuestador.service');

async function postEncuestaSpe(req, res) {
  const parsed = encuestaSpeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const resultado = await speEncuestadorService.registrarEncuestaSpe({
      ...parsed.data,
      userId: req.user.userId,
    });
    return res.status(201).json({
      message: 'Encuesta SPE registrada. Queda pendiente de aprobación.',
      ...resultado,
    });
  } catch (err) {
    if (err.message === 'EVENTO_SPE_NO_ASIGNADO') {
      return res.status(400).json({ error: 'El evento no está asignado a este encuestador o no habilita encuestas SPE' });
    }
    console.error('Error al registrar encuesta SPE:', err);
    return res.status(500).json({ error: 'No se pudo registrar la encuesta SPE' });
  }
}

module.exports = { postEncuestaSpe };
