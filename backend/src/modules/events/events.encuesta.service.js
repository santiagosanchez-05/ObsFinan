const pool = require('../../config/db');
const { ESTADO } = require('../../config/estados');

// Encuestas desde "Mis eventos" (ICA: Liz US57, SPE: Kevin Alanes US66).
// El encuestador solo puede cargar en un evento activo al que está anotado o
// asignado y que habilita esa encuesta. El período de la encuesta sale de la
// fecha del evento, no del formulario.
const FLAG = { ica: 'has_ica', spe: 'has_spe' };

async function periodoDelEventoAsignado({ eventId, userId, encuesta }) {
  const [eventos] = await pool.query(
    `SELECT YEAR(e.event_date) AS year,
            QUARTER(e.event_date) AS quarter,
            IF(MONTH(e.event_date) <= 6, 1, 2) AS semester
       FROM event e
       INNER JOIN event_surveyor es
         ON es.event_id = e.event_id
        AND es.surveyor_user_id = ?
        AND es.status = ?
      WHERE e.event_id = ?
        AND e.${FLAG[encuesta]} = 1
        AND e.status = ?
      LIMIT 1`,
    [userId, ESTADO.ACTIVO, eventId, ESTADO.ACTIVO],
  );
  if (!eventos.length) throw new Error(`EVENTO_${encuesta.toUpperCase()}_NO_ASIGNADO`);
  const { year, quarter, semester } = eventos[0];
  return { year: Number(year), quarter: Number(quarter), semester: Number(semester) };
}

module.exports = { periodoDelEventoAsignado };
