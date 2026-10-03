// backend/src/modules/users/users.encuestadores.controller.js
// Kevin Alanes — US54 (registro directo de un encuestador, sin convocatoria).
// - Superadmin: en cualquier sede. Admin: SOLO en la suya (forzar
//   campusId = req.user.campusId, no confiar en lo que mande el formulario).
// - El rol siempre es 'encuestador' (un Admin no puede crear admins).
// - Reutiliza registrarUsuario de ./users.service.js (contraseña temporal +
//   correo de bienvenida) — importarlo, no modificarlo ni copiarlo.

const { encuestadorSchema } = require("./users.encuestadores.validation");
const { puedeGestionarSede } = require("../../middlewares/sede.middleware");
const { registrarUsuario } = require("./users.service");

async function postRegistrarEncuestador(req, res) {
  // 1. Validar datos del formulario
  const parsed = encuestadorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Datos inválidos", detalles: parsed.error.flatten() });
  }

  const datos = parsed.data;

  // 2. Control de acceso por sede
  //    Admin: solo puede crear en su propia sede (ignoramos el campusId del body)
  //    Superadmin: puede crear en cualquier sede
  const campusIdFinal =
    req.user.role === "superadmin" ? datos.campusId : req.user.campusId;

  if (!puedeGestionarSede(req.user, campusIdFinal)) {
    return res
      .status(403)
      .json({ error: "No podés registrar encuestadores en otra sede" });
  }

  // 3. Registrar el usuario reutilizando la función existente
  try {
    const resultado = await registrarUsuario({
      nombre: datos.nombre,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno || null,
      correo: datos.correo,
      rol: "encuestador", // ← Siempre encuestador
      campusId: campusIdFinal,
      creadoPor: req.user.userId,
      foto: req.file?.buffer ?? null,
    });

    return res.status(201).json({
      message: "Encuestador registrado correctamente",
      userId: resultado.userId,
      passwordTemporal: resultado.passwordTemporal,
      correoEnviado: resultado.correoEnviado,
    });
  } catch (err) {
    if (err.message === "CORREO_YA_REGISTRADO") {
      return res
        .status(409)
        .json({ error: "Ya existe un usuario con ese correo" });
    }
    if (err.message === "ROL_INVALIDO") {
      return res.status(500).json({ error: "Error de configuración de roles" });
    }
    console.error("Error al registrar encuestador:", err);
    return res
      .status(500)
      .json({ error: "No se pudo registrar al encuestador" });
  }
}

module.exports = { postRegistrarEncuestador };
