// Kevin Alanes — US66. El encuestador registra una encuesta SPE en un evento
// asignado; entra PENDIENTE hasta que el Superadmin la apruebe (US62), y recién
// ahí se calculan sus índices.
// Usa el mismo mapeo y la misma validación que el registro del Superadmin
// (spe.registro.*): un solo lugar con las columnas reales y las opciones del Word.
const pool = require('../../config/db');
const { ESTADO_CARGA, MODULO } = require('../../config/estados');
const { insertarEncuesta } = require('./spe.registro.service');
const { periodoDelEventoAsignado } = require('../events/events.encuesta.service');
const notificaciones = require('../notificaciones/notificaciones.service');

async function registrarEncuestaSpe({ userId, eventId, ...respuestas }) {
  const { year, semester } = await periodoDelEventoAsignado({ eventId, userId, encuesta: 'spe' });

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await insertarEncuesta(conexion, {
      estado: ESTADO_CARGA.PENDIENTE,
      nombreCarga: 'Encuesta de evento',
      year,
      semester,
      userId,
      eventId,
      respuestas,
    });
    await conexion.commit();
    notificaciones.encuestaPendiente({ modulo: MODULO.SPE, dataLoadId: resultado.dataLoadId, encuestadorId: userId, eventId });
    return { ...resultado, periodo: { year, semester } };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { registrarEncuestaSpe };
