// backend/src/modules/convocatorias/convocatorias.gestion.service.js
const pool = require("../../config/db");
const { ESTADO, ESTADO_POSTULANTE } = require("../../config/estados");
const { registrarUsuario } = require("../users/users.service");

// ============================================================================
// US50 — Crear convocatoria
// ============================================================================
async function crearConvocatoria(
  { campus_id, title, start_date, end_date, description },
  userId,
) {
  const [campus] = await pool.query(
    "SELECT campus_id FROM campus WHERE campus_id = ? AND status = ?",
    [campus_id, ESTADO.ACTIVO],
  );
  if (!campus.length) throw new Error("CAMPUS_NO_ENCONTRADO");

  const [result] = await pool.query(
    `INSERT INTO convocation 
       (campus_id, title, start_date, end_date, description, status, created_modified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      campus_id,
      title,
      start_date,
      end_date,
      description || null,
      ESTADO.ACTIVO,
      userId,
    ],
  );

  return {
    convocation_id: result.insertId,
    campus_id,
    title,
    start_date,
    end_date,
    description: description || null,
    status: ESTADO.ACTIVO,
  };
}

// ============================================================================
// US53 — Listar postulantes de una convocatoria
// ============================================================================
async function obtenerPostulantes(convocationId) {
  const [conv] = await pool.query(
    "SELECT convocation_id, campus_id, title FROM convocation WHERE convocation_id = ?",
    [convocationId],
  );
  if (!conv.length) throw new Error("CONVOCATORIA_NO_ENCONTRADA");

  const [rows] = await pool.query(
    `SELECT 
       a.applicant_id,
       a.convocation_id,
       a.user_id,
       a.first_name,
       a.paternal_last_name,
       a.maternal_last_name,
       a.email,
       a.phone,
       a.status,
       a.created_at,
       a.updated_at
     FROM applicant a
     WHERE a.convocation_id = ? AND a.status != ?
     ORDER BY a.created_at DESC`,
    [convocationId, ESTADO_POSTULANTE.ELIMINADO],
  );

  const pendientes = rows.filter(
    (r) => r.status === ESTADO_POSTULANTE.PENDIENTE,
  ).length;
  const aprobados = rows.filter(
    (r) => r.status === ESTADO_POSTULANTE.APROBADO,
  ).length;
  const rechazados = rows.filter(
    (r) => r.status === ESTADO_POSTULANTE.RECHAZADO,
  ).length;

  return {
    convocatoria: {
      id: conv[0].convocation_id,
      campus_id: conv[0].campus_id,
      titulo: conv[0].title,
    },
    stats: { pendientes, aprobados, rechazados, total: rows.length },
    postulantes: rows.map((r) => ({
      id: r.applicant_id,
      userId: r.user_id,
      nombre: r.first_name,
      apellidoPaterno: r.paternal_last_name,
      apellidoMaterno: r.maternal_last_name,
      nombreCompleto: [r.first_name, r.paternal_last_name, r.maternal_last_name]
        .filter(Boolean)
        .join(" "),
      correo: r.email,
      telefono: r.phone,
      status: r.status,
      fechaSolicitud: r.created_at,
    })),
  };
}

// ============================================================================
// US53 — Aprobar o rechazar un postulante
// ============================================================================
// `puedeGestionar(campusId)` lo pasa el controlador: la sede se revisa ANTES de
// crear la cuenta o tocar el postulante.
async function actualizarPostulante(applicantId, nuevoStatus, actorId, puedeGestionar = () => true) {
  const [rows] = await pool.query(
    `SELECT a.applicant_id, a.user_id, a.first_name, a.paternal_last_name,
            a.maternal_last_name, a.email, a.status, c.campus_id
     FROM applicant a
     JOIN convocation c ON c.convocation_id = a.convocation_id
     WHERE a.applicant_id = ? AND a.status != ?`,
    [applicantId, ESTADO_POSTULANTE.ELIMINADO],
  );
  if (!rows.length) throw new Error("POSTULANTE_NO_ENCONTRADO");

  const postulante = rows[0];
  if (!puedeGestionar(postulante.campus_id)) throw new Error("SEDE_AJENA");
  if (postulante.status === ESTADO_POSTULANTE.APROBADO) {
    throw new Error("POSTULANTE_YA_APROBADO");
  }

  let userIdCreado = postulante.user_id;

  // Aprobar = crear la cuenta de encuestador en la sede de la convocatoria
  // (contraseña temporal + correo de bienvenida, igual que el registro normal).
  if (nuevoStatus === ESTADO_POSTULANTE.APROBADO) {
    const resultado = await registrarUsuario({
      nombre: postulante.first_name,
      apellidoPaterno: postulante.paternal_last_name,
      apellidoMaterno: postulante.maternal_last_name || null,
      correo: postulante.email,
      rol: "encuestador",
      campusId: postulante.campus_id,
      creadoPor: actorId,
      foto: null,
    });
    userIdCreado = resultado.userId;
  }

  await pool.query(
    `UPDATE applicant
     SET status = ?, user_id = ?, created_modified_by = ?, updated_at = NOW()
     WHERE applicant_id = ?`,
    [nuevoStatus, userIdCreado, actorId, applicantId],
  );

  return {
    applicant_id: applicantId,
    status: nuevoStatus,
    user_id: userIdCreado,
    campus_id: postulante.campus_id,
  };
}

module.exports = {
  crearConvocatoria,
  obtenerPostulantes,
  actualizarPostulante,
};
