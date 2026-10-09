// backend/src/modules/convocatorias/convocatorias.gestion.controller.js
// Kevin Alanes — US50 (crear convocatoria) y US53 (gestionar postulantes).
// Tablas: convocation, applicant. Al aprobar un postulante se le crea la
// cuenta de encuestador reutilizando registrarUsuario de
// modules/users/users.service.js (importarlo, no copiarlo).
const {
  convocatoriaSchema,
  patchPostulanteSchema,
} = require("./convocatorias.gestion.validation");
const gestionService = require("./convocatorias.gestion.service");
const { puedeGestionarSede } = require("../../middlewares/sede.middleware");
const { ESTADO_POSTULANTE } = require("../../config/estados");

// ============================================================================
// US50 — Crear convocatoria
// ============================================================================
async function postConvocatoria(req, res) {
  const parsed = convocatoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", detalles: parsed.error.flatten() });
  }

  // Control por sede (US65 — Santiago): el Admin solo abre convocatorias de su sede.
  if (!puedeGestionarSede(req.user, parsed.data.campus_id)) {
    return res
      .status(403)
      .json({ error: "Solo puedes crear convocatorias de tu sede" });
  }

  try {
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

// ============================================================================
// US53 — Listar postulantes
// ============================================================================
async function getPostulantes(req, res) {
  const convocationId = Number(req.params.id);
  if (!Number.isInteger(convocationId) || convocationId <= 0) {
    return res.status(400).json({ error: "ID de convocatoria inválido" });
  }

  try {
    const data = await gestionService.obtenerPostulantes(convocationId);

    if (!puedeGestionarSede(req.user, data.convocatoria.campus_id)) {
      return res
        .status(403)
        .json({ error: "No podés ver postulantes de otra sede" });
    }

    return res.json(data);
  } catch (err) {
    if (err.message === "CONVOCATORIA_NO_ENCONTRADA") {
      return res.status(404).json({ error: "Convocatoria no encontrada" });
    }
    console.error("Error al obtener postulantes:", err);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener los postulantes" });
  }
}

// ============================================================================
// US53 — Aprobar o rechazar un postulante
// ============================================================================
async function patchPostulante(req, res) {
  const applicantId = Number(req.params.id);
  if (!Number.isInteger(applicantId) || applicantId <= 0) {
    return res.status(400).json({ error: "ID de postulante inválido" });
  }

  const parsed = patchPostulanteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", detalles: parsed.error.flatten() });
  }

  try {
    const resultado = await gestionService.actualizarPostulante(
      applicantId,
      parsed.data.status,
      req.user.userId,
    );

    if (!puedeGestionarSede(req.user, resultado.campus_id)) {
      return res
        .status(403)
        .json({ error: "No podés gestionar postulantes de otra sede" });
    }

    const mensajes = {
      [ESTADO_POSTULANTE.APROBADO]:
        "Postulante aprobado y cuenta de encuestador creada",
      [ESTADO_POSTULANTE.RECHAZADO]: "Postulante rechazado",
    };

    return res.json({
      message: mensajes[parsed.data.status] || "Postulante actualizado",
      postulante: resultado,
    });
  } catch (err) {
    if (err.message === "POSTULANTE_NO_ENCONTRADO") {
      return res.status(404).json({ error: "Postulante no encontrado" });
    }
    if (err.message === "POSTULANTE_YA_APROBADO") {
      return res.status(409).json({ error: "Este postulante ya fue aprobado" });
    }
    if (err.message === "CORREO_YA_REGISTRADO") {
      return res
        .status(409)
        .json({ error: "Ya existe un usuario con ese correo" });
    }
    console.error("Error al actualizar postulante:", err);
    return res
      .status(500)
      .json({ error: "No se pudo actualizar el postulante" });
  }
}

module.exports = { postConvocatoria, getPostulantes, patchPostulante };
