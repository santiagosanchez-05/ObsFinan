// Valores de las columnas status/modality/type de la BD — Sprint 2.
// Usa SIEMPRE estas constantes en vez de números sueltos en las queries:
// si cada uno inventa su propio "2 = aprobado", los módulos dejan de
// entenderse entre sí (ver docs/SPRINT2.md).

// user, role, campus, community, event, convocation, event_surveyor,
// ica_measurement, ica_survey_response, spe_measurement
const ESTADO = {
  INACTIVO: 0, // dado de baja / eliminado lógicamente
  ACTIVO: 1,
};

// data_load.status — la aprobación de encuestas vive acá (una carga = una
// encuesta individual o un archivo completo).
const ESTADO_CARGA = {
  ELIMINADA: 0,
  PENDIENTE: 1, // la mandó un encuestador y espera revisión
  APROBADA: 2, // cuenta en los dashboards (lo que carga un Admin/Superadmin entra acá directo)
  RECHAZADA: 3,
};

// applicant.status
const ESTADO_POSTULANTE = {
  ELIMINADO: 0,
  PENDIENTE: 1,
  APROBADO: 2, // se le creó la cuenta de encuestador (applicant.user_id)
  RECHAZADO: 3,
};

// event.modality
const MODALIDAD_EVENTO = {
  PRESENCIAL: 1,
  VIRTUAL: 2,
  HIBRIDO: 3,
};

// data_load.module
const MODULO = {
  ICA: 1,
  SPE: 2,
};

// data_load.source_type
const TIPO_CARGA = {
  INDIVIDUAL: 1,
  ARCHIVO: 2,
};

// image.type (tabla polimórfica: entity_id apunta al id de esa entidad)
const TIPO_IMAGEN = {
  USUARIO: 'user',
  EVENTO: 'event',
};

// spe_measurement.semester
const SEMESTRE = {
  PRIMERO: 1,
  SEGUNDO: 2,
};

module.exports = {
  ESTADO,
  ESTADO_CARGA,
  ESTADO_POSTULANTE,
  MODALIDAD_EVENTO,
  MODULO,
  TIPO_CARGA,
  TIPO_IMAGEN,
  SEMESTRE,
};
