const pool = require('../../config/db');
const { ESTADO, MODALIDAD_EVENTO, TIPO_IMAGEN } = require('../../config/estados');
const { detectarMimeType } = require('../users/users.service');

const NOMBRE_MODALIDAD = {
  [MODALIDAD_EVENTO.PRESENCIAL]: 'Presencial',
  [MODALIDAD_EVENTO.VIRTUAL]: 'Virtual',
  [MODALIDAD_EVENTO.HIBRIDO]: 'Híbrido',
};

// Fecha de hoy en Bolivia (UTC-4 todo el año), en formato AAAA-MM-DD.
function hoyEnBolivia(ahora = new Date()) {
  return new Date(ahora.getTime() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Fechas y horas formateadas en SQL para no depender de la zona horaria del driver.
const COLUMNAS_EVENTO = `
  e.event_id, e.campus_id, c.campus_name, e.title,
  DATE_FORMAT(e.event_date, '%Y-%m-%d') AS fecha,
  TIME_FORMAT(e.event_time, '%H:%i') AS hora,
  e.modality, e.available_slots, e.location, e.description, e.external_link,
  e.has_ica, e.has_spe,
  (SELECT MAX(i.image_id) FROM image i WHERE i.type = '${TIPO_IMAGEN.EVENTO}' AND i.entity_id = e.event_id) AS image_id`;

function aEvento(row) {
  return {
    id: row.event_id,
    titulo: row.title,
    fecha: row.fecha,
    hora: row.hora,
    modalidad: row.modality,
    modalidadNombre: NOMBRE_MODALIDAD[row.modality] ?? 'Sin definir',
    lugar: row.location,
    descripcion: row.description,
    cupos: row.available_slots,
    enlaceExterno: row.external_link,
    hasIca: Boolean(row.has_ica),
    hasSpe: Boolean(row.has_spe),
    campusId: row.campus_id,
    sede: row.campus_name,
    // El id de la imagen sirve de "versión": si cambia la imagen, cambia la URL y el navegador no usa la vieja.
    imagenUrl: row.image_id ? `/api/events/${row.event_id}/image?v=${row.image_id}` : null,
  };
}

// US43 — agenda pública. Próximos: de hoy en adelante, el más cercano primero.
// Pasados: el más reciente primero.
// `encuestador` ({ userId, campusId }) solo llega cuando quien mira es un
// encuestador: cada evento trae `puedeParticipar` y `participando`, y con
// `disponibles` se listan solo los eventos con encuesta de su sede que no pasaron.
async function listarEventos({ periodo = 'proximos', campusId, q, page = 1, pageSize = 12, disponibles = false, encuestador = null } = {}) {
  const condiciones = ['e.status = ?'];
  const params = [ESTADO.ACTIVO];
  const hoy = hoyEnBolivia();

  if (encuestador && disponibles) {
    periodo = 'proximos';
    campusId = encuestador.campusId;
    condiciones.push('(e.has_ica = 1 OR e.has_spe = 1)');
  }

  if (periodo === 'proximos') {
    condiciones.push('e.event_date >= ?');
    params.push(hoy);
  } else if (periodo === 'pasados') {
    condiciones.push('e.event_date < ?');
    params.push(hoy);
  }
  if (campusId) {
    condiciones.push('e.campus_id = ?');
    params.push(campusId);
  }
  if (q) {
    condiciones.push('(e.title LIKE ? OR e.location LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = condiciones.join(' AND ');
  const orden = periodo === 'pasados' ? 'DESC' : 'ASC';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM event e WHERE ${where}`, params);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const pagina = Math.min(page, totalPaginas);

  const [rows] = await pool.query(
    `SELECT ${COLUMNAS_EVENTO}
       FROM event e
       JOIN campus c ON c.campus_id = e.campus_id
      WHERE ${where}
      ORDER BY e.event_date ${orden}, e.event_time ${orden}
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (pagina - 1) * pageSize],
  );

  let eventos = rows.map(aEvento);
  if (encuestador) {
    const anotados = new Set();
    if (rows.length) {
      const [filas] = await pool.query(
        'SELECT event_id FROM event_surveyor WHERE surveyor_user_id = ? AND status = ? AND event_id IN (?)',
        [encuestador.userId, ESTADO.ACTIVO, rows.map((row) => row.event_id)],
      );
      filas.forEach((f) => anotados.add(f.event_id));
    }
    eventos = eventos.map((ev) => ({
      ...ev,
      participando: anotados.has(ev.id),
      puedeParticipar:
        Number(ev.campusId) === Number(encuestador.campusId) && (ev.hasIca || ev.hasSpe) && ev.fecha >= hoy,
    }));
  }

  const [sedes] = await pool.query('SELECT campus_id, campus_name FROM campus WHERE status = ? ORDER BY campus_name', [
    ESTADO.ACTIVO,
  ]);

  return {
    eventos,
    paginacion: { pagina, porPagina: pageSize, total, totalPaginas },
    opcionesFiltros: { sedes: sedes.map((s) => ({ id: s.campus_id, nombre: s.campus_name })) },
  };
}

// US47 — detalle público. Los eventos dados de baja no se muestran.
async function obtenerEvento(eventId) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNAS_EVENTO}
       FROM event e
       JOIN campus c ON c.campus_id = e.campus_id
      WHERE e.event_id = ? AND e.status = ?`,
    [eventId, ESTADO.ACTIVO],
  );
  return rows[0] ? aEvento(rows[0]) : null;
}

// Para requireSedeDelRecurso: sede del evento activo, o null si no existe.
async function obtenerCampusDelEvento(eventId) {
  const id = Number(eventId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [rows] = await pool.query('SELECT campus_id FROM event WHERE event_id = ? AND status = ?', [id, ESTADO.ACTIVO]);
  return rows[0]?.campus_id ?? null;
}

async function existeSedeActiva(campusId) {
  const [rows] = await pool.query('SELECT campus_id FROM campus WHERE campus_id = ? AND status = ?', [
    campusId,
    ESTADO.ACTIVO,
  ]);
  return rows.length > 0;
}

async function obtenerImagenEvento(eventId) {
  const [rows] = await pool.query(
    `SELECT i.image_blob
       FROM image i
       JOIN event e ON e.event_id = i.entity_id AND e.status = ?
      WHERE i.type = ? AND i.entity_id = ?
      ORDER BY i.image_id DESC LIMIT 1`,
    [ESTADO.ACTIVO, TIPO_IMAGEN.EVENTO, eventId],
  );
  const blob = rows[0]?.image_blob;
  if (!blob) return null;
  return { buffer: blob, mimeType: detectarMimeType(blob) };
}

function valoresEvento(datos) {
  return [
    datos.campusId,
    datos.titulo,
    datos.fecha,
    datos.hora,
    datos.modalidad,
    datos.cupos ?? null,
    datos.lugar,
    datos.descripcion ?? null,
    datos.enlaceExterno ?? null,
    datos.hasIca ? 1 : 0,
    datos.hasSpe ? 1 : 0,
  ];
}

// US44 — registro (con imagen opcional en la tabla image, type = 'event').
async function crearEvento(datos, { imagen, creadoPor }) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [resultado] = await conexion.query(
      `INSERT INTO event
         (campus_id, title, event_date, event_time, modality, available_slots, location,
          description, external_link, has_ica, has_spe, status, created_modified_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...valoresEvento(datos), ESTADO.ACTIVO, creadoPor],
    );
    const eventId = resultado.insertId;
    if (imagen) {
      await conexion.query('INSERT INTO image (image_blob, type, entity_id) VALUES (?, ?, ?)', [
        imagen,
        TIPO_IMAGEN.EVENTO,
        eventId,
      ]);
    }
    await conexion.commit();
    return eventId;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

// US45 — edición. La imagen se reemplaza (no se acumulan) o se quita.
async function editarEvento(eventId, datos, { imagen, quitarImagen, editadoPor }) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      `UPDATE event
          SET campus_id = ?, title = ?, event_date = ?, event_time = ?, modality = ?, available_slots = ?,
              location = ?, description = ?, external_link = ?, has_ica = ?, has_spe = ?,
              created_modified_by = ?
        WHERE event_id = ? AND status = ?`,
      [...valoresEvento(datos), editadoPor, eventId, ESTADO.ACTIVO],
    );
    if (imagen || quitarImagen) {
      await conexion.query('DELETE FROM image WHERE type = ? AND entity_id = ?', [TIPO_IMAGEN.EVENTO, eventId]);
    }
    if (imagen) {
      await conexion.query('INSERT INTO image (image_blob, type, entity_id) VALUES (?, ?, ?)', [
        imagen,
        TIPO_IMAGEN.EVENTO,
        eventId,
      ]);
    }
    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

// US46 — baja lógica. También se dan de baja sus asignaciones de encuestadores.
async function eliminarEvento(eventId, eliminadoPor) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query('UPDATE event SET status = ?, created_modified_by = ? WHERE event_id = ?', [
      ESTADO.INACTIVO,
      eliminadoPor,
      eventId,
    ]);
    await conexion.query('UPDATE event_surveyor SET status = ?, created_modified_by = ? WHERE event_id = ?', [
      ESTADO.INACTIVO,
      eliminadoPor,
      eventId,
    ]);
    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

// El encuestador se anota solo en eventos con encuesta de su sede (sin límite
// de encuestadores). Usa la misma tabla que la asignación del Admin (US55):
// si ya estuvo anotado y se había bajado, se reactiva la fila.
async function estaParticipando(eventId, userId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM event_surveyor WHERE event_id = ? AND surveyor_user_id = ? AND status = ?',
    [eventId, userId, ESTADO.ACTIVO],
  );
  return rows.length > 0;
}

async function participarEnEvento(eventId, userId) {
  await pool.query(
    `INSERT INTO event_surveyor (event_id, surveyor_user_id, status, created_modified_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), created_modified_by = VALUES(created_modified_by)`,
    [eventId, userId, ESTADO.ACTIVO, userId],
  );
}

async function dejarDeParticipar(eventId, userId) {
  await pool.query(
    'UPDATE event_surveyor SET status = ?, created_modified_by = ? WHERE event_id = ? AND surveyor_user_id = ?',
    [ESTADO.INACTIVO, userId, eventId, userId],
  );
}

module.exports = {
  hoyEnBolivia,
  listarEventos,
  obtenerEvento,
  obtenerCampusDelEvento,
  existeSedeActiva,
  obtenerImagenEvento,
  crearEvento,
  editarEvento,
  eliminarEvento,
  estaParticipando,
  participarEnEvento,
  dejarDeParticipar,
};
