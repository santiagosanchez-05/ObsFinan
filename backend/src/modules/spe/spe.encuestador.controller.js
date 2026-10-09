// backend/src/modules/spe/spe.encuestador.controller.js
// Kevin Alanes — US66 (el encuestador registra una encuesta SPE en un evento
// asignado; entra PENDIENTE hasta que un Superadmin la apruebe).
const { encuestaSpeSchema } = require("./spe.encuestador.validation");
const speEncuestadorService = require("./spe.encuestador.service");

module.exports = {
  async postEncuestaSpe(req, res) {
    // 1. Validar datos
    const parsed = encuestaSpeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Datos inválidos", detalles: parsed.error.flatten() });
    }

    try {
      // 2. Guardar la encuesta
      const resultado = await speEncuestadorService.registrarEncuestaSpe({
        ...parsed.data,
        userId: req.user.userId,
      });

      return res.status(201).json({
        message: "Encuesta SPE registrada. Queda pendiente de aprobación.",
        ...resultado,
      });
    } catch (err) {
      if (err.message === "EVENTO_NO_ENCONTRADO") {
        return res.status(404).json({ error: "Evento no encontrado" });
      }
      if (err.message === "EVENTO_SIN_SPE") {
        return res
          .status(400)
          .json({ error: "Este evento no tiene habilitada la encuesta SPE" });
      }
      if (err.message === "ENCUESTADOR_NO_ASIGNADO") {
        return res
          .status(403)
          .json({ error: "No estás asignado a este evento" });
      }
      console.error("Error al registrar encuesta SPE:", err);
      return res
        .status(500)
        .json({ error: "No se pudo registrar la encuesta SPE" });
    }
  },
};
