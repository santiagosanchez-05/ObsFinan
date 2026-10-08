// Liz — US37 (registro individual SPE por el Superadmin; entra APROBADO).
const { registroSpeSchema } = require('./spe.registro.validation');
const speRegistroService = require('./spe.registro.service');

module.exports = {
  async postRegistroSpe(req, res) {
    const parsed = registroSpeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
    }
    try {
      const resultado = await speRegistroService.registrarRegistroIndividual({
        ...parsed.data,
        userId: req.user.userId,
      });
      return res.status(201).json({ message: 'Registro SPE guardado correctamente', ...resultado });
    } catch (err) {
      console.error('Error al registrar SPE:', err);
      return res.status(500).json({ error: 'No se pudo guardar el registro SPE' });
    }
  },
};
