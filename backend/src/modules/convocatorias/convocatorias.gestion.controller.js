// backend/src/modules/convocatorias/convocatorias.gestion.controller.js
// Kevin Alanes — US50 (crear convocatoria) y US53 (revisar/aprobar/rechazar postulantes).
// Tablas: convocation, applicant. Al aprobar un postulante se le crea la
// cuenta de encuestador reutilizando registrarUsuario de
// modules/users/users.service.js (importarlo, no copiarlo).
const pendiente = require("../../utils/pendiente");
const { convocatoriaSchema } = require("./convocatorias.gestion.validation");
const gestionService = require("./convocatorias.gestion.service");

async function postConvocatoria(req, res) {
  // 1. Validar datos
  const parsed = convocatoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", detalles: parsed.error.flatten() });
  }

  try {
    // 2. Llamar al service (el userId viene del token, gracias a requireAuth)
    const convocatoria = await gestionService.crearConvocatoria(
      parsed.data,
      req.user.userId,
    );
    return res
      .status(201)
      .json({ message: "Convocatoria creada", convocatoria });
  } catch (err) {
    if (err.message === "CAMPUS_NO_ENCONTRADO") {
      return res
        .status(400)
        .json({ error: "El campus seleccionado no existe o no está activo" });
    }
    console.error("Error al crear convocatoria:", err);
    return res.status(500).json({ error: "No se pudo crear la convocatoria" });
  }
}

module.exports = {
  postConvocatoria,
  getPostulantes: pendiente("US53", "Kevin Alanes"),
  patchPostulante: pendiente("US53", "Kevin Alanes"),
};
