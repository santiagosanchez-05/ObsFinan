const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaIcaSchema, ENCABEZADOS_ESPERADOS } = require('./ica.validation');

// module: 1=ICA, 2=SPE; source_type: 1=individual, 2=archivo
const MODULE_ICA = 1;
const SOURCE_TYPE_ARCHIVO = 2;
const SOURCE_TYPE_INDIVIDUAL = 1;

// Carpeta física donde se guardan los archivos subidos. Queda fuera de src/
// (backend/uploads/ica) para no mezclar archivos de usuarios con el código fuente.
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/ica');

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  const numero = Number(String(valor).replace(',', '.').trim());
  return Number.isFinite(numero) ? numero : null;
}

function parsearArchivoIca(buffer) {
  const libro = xlsx.read(buffer, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: null });

  const encabezados = (filas[1] || []).slice(0, 5).map((h) => String(h || '').trim());
  const encabezadosOk = ENCABEZADOS_ESPERADOS.every((esperado, i) => encabezados[i] === esperado);
  if (!encabezadosOk) {
    const err = new Error('ENCABEZADOS_INVALIDOS');
    err.detalle = { esperado: ENCABEZADOS_ESPERADOS, recibido: encabezados };
    throw err;
  }

  const datos = [];
  for (let i = 2; i < filas.length; i++) {
    const fila = filas[i] || [];
    const comuna = fila[0];
    if (comuna === null || comuna === undefined || String(comuna).trim() === '') {
      break;
    }

    const conocimiento = aNumero(fila[1]);
    const uso = aNumero(fila[2]);
    const educacion = aNumero(fila[3]);
    const prevision = aNumero(fila[4]);
    const icaHombres = aNumero(fila[8]);
    const icaMujeres = aNumero(fila[9]);

    // Después de la tabla de datos, la hoja sigue con párrafos de texto (hallazgos,
    // explicación de la tabla) pegados en la misma columna A. Esas filas tienen
    // "comuna" con texto pero NINGÚN valor numérico — es la señal real de que la
    // tabla de datos terminó, más confiable que solo mirar si la comuna está vacía.
    const sinNingunNumero = [conocimiento, uso, educacion, prevision, icaHombres, icaMujeres].every(
      (valor) => valor === null,
    );
    if (sinNingunNumero) {
      break;
    }

    datos.push({
      filaExcel: i + 1,
      comuna: String(comuna).trim(),
      conocimiento,
      uso,
      educacion,
      prevision,
      icaHombres,
      icaMujeres,
    });
  }

  if (datos.length === 0) {
    throw new Error('ARCHIVO_SIN_FILAS');
  }

  return datos;
}

function validarFilas(datos) {
  const errores = [];
  const filasValidas = [];

  for (const fila of datos) {
    const parsed = filaIcaSchema.safeParse(fila);
    if (!parsed.success) {
      errores.push({ fila: fila.filaExcel, comuna: fila.comuna, errores: parsed.error.flatten().fieldErrors });
    } else {
      filasValidas.push(parsed.data);
    }
  }

  return { filasValidas, errores };
}

async function resolverComunidades(filasValidas, campusId) {
  const [comunidades] = await pool.query(
    `SELECT community_id, community_name FROM community WHERE campus_id = ? AND status = 1`,
    [campusId],
  );

  const mapa = new Map(comunidades.map((c) => [c.community_name.trim().toLowerCase(), c.community_id]));

  const filasConId = [];
  const noEncontradas = [];
  for (const fila of filasValidas) {
    const communityId = mapa.get(fila.comuna.trim().toLowerCase());
    if (!communityId) {
      noEncontradas.push(fila.comuna);
    } else {
      filasConId.push({ ...fila, communityId });
    }
  }

  return { filasConId, noEncontradas };
}

async function obtenerComunidadesPorSede(campusId) {
  const [comunidades] = await pool.query(
    `SELECT community_id, community_name FROM community WHERE campus_id = ? AND status = 1`,
    [campusId],
  );

  return comunidades;
}

async function obtenerHistorial({ campusId }) {
  const [filas] = await pool.query(
    `SELECT dl.data_load_id, dl.source_type, dl.file_name, dl.total_rows, dl.created_at,
            MIN(m.year) AS year, MIN(m.quarter) AS quarter,
            COUNT(DISTINCT m.community_id) AS communities,
            GROUP_CONCAT(DISTINCT c.community_name ORDER BY c.community_name SEPARATOR ', ') AS community_names
       FROM data_load dl
       INNER JOIN ica_measurement m ON m.data_load_id = dl.data_load_id AND m.status = 1
       INNER JOIN community c ON c.community_id = m.community_id AND c.status = 1
      WHERE dl.module = ? AND dl.status = 1 AND c.campus_id = ?
      GROUP BY dl.data_load_id, dl.source_type, dl.file_name, dl.total_rows, dl.created_at
      ORDER BY dl.created_at DESC`,
    [MODULE_ICA, campusId],
  );

  return filas.map((fila) => ({
    id: fila.data_load_id,
    tipo: Number(fila.source_type) === SOURCE_TYPE_ARCHIVO ? 'masiva' : 'manual',
    origen: fila.file_name,
    comuna: Number(fila.communities) === 1 ? fila.community_names : `${fila.communities} comunas`,
    periodo: `${fila.year} - Q${fila.quarter}`,
    total: Number(fila.total_rows),
    fecha: fila.created_at,
  }));
}

function promedio(valores) {
  const validos = valores.filter((valor) => valor !== null && valor !== undefined);
  return validos.length ? validos.reduce((total, valor) => total + Number(valor), 0) / validos.length : null;
}

function transformarMedicion(row) {
  const dimensiones = [row.conocimiento, row.uso, row.educacion, row.prevision];
  return {
    id: row.ica_measurement_id,
    communityId: row.community_id,
    nombre: row.community_name,
    conocimiento: Number(row.conocimiento),
    uso: Number(row.uso),
    educacion: Number(row.educacion),
    prevision: Number(row.prevision),
    hombres: Number(row.ica_hombres),
    mujeres: Number(row.ica_mujeres),
    valor: Number(promedio(dimensiones).toFixed(1)),
  };
}

async function obtenerDashboard({ campusId, year, quarter, communityId }) {
  const condiciones = ['c.campus_id = ?', 'c.status = 1', 'm.status = 1'];
  const parametros = [campusId];

  if (year) {
    condiciones.push('m.year = ?');
    parametros.push(year);
  }
  if (quarter) {
    condiciones.push('m.quarter = ?');
    parametros.push(quarter);
  }
  if (communityId) {
    condiciones.push('m.community_id = ?');
    parametros.push(communityId);
  }

  const [filas] = await pool.query(
    `SELECT m.ica_measurement_id, m.community_id, c.community_name,
            m.year, m.quarter, m.knowledge_index AS conocimiento,
            m.usage_index AS uso, m.education_index AS educacion,
            m.foresight_index AS prevision, m.ica_male AS ica_hombres,
            m.ica_female AS ica_mujeres
       FROM ica_measurement m
       INNER JOIN community c ON c.community_id = m.community_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY m.year DESC, m.quarter DESC, c.community_name ASC`,
    parametros,
  );

  if (!filas.length) {
    return { periodo: null, comunas: [], dimensiones: [], brechas: [], metricas: null };
  }

  const periodo = { year: Number(filas[0].year), quarter: Number(filas[0].quarter) };
  const filasPeriodo = filas.filter((fila) => Number(fila.year) === periodo.year && Number(fila.quarter) === periodo.quarter);
  const comunas = filasPeriodo.map(transformarMedicion);
  const dimensiones = [
    { dimension: 'Conocimiento', valor: promedio(comunas.map((fila) => fila.conocimiento)) },
    { dimension: 'Uso', valor: promedio(comunas.map((fila) => fila.uso)) },
    { dimension: 'Educación', valor: promedio(comunas.map((fila) => fila.educacion)) },
    { dimension: 'Previsión', valor: promedio(comunas.map((fila) => fila.prevision)) },
  ].map((fila) => ({ ...fila, valor: Number(fila.valor.toFixed(1)) }));
  const brechas = comunas.map((fila) => ({
    nombre: fila.nombre,
    hombres: fila.hombres,
    mujeres: fila.mujeres,
  }));
  const mejor = comunas.reduce((actual, fila) => (fila.valor > actual.valor ? fila : actual), comunas[0]);
  const dimensionCritica = dimensiones.reduce((actual, fila) => (fila.valor < actual.valor ? fila : actual), dimensiones[0]);
  const brechaMayor = comunas.reduce((actual, fila) => (Math.abs(fila.hombres - fila.mujeres) > Math.abs(actual.hombres - actual.mujeres) ? fila : actual), comunas[0]);

  return {
    periodo,
    comunas,
    dimensiones,
    brechas,
    metricas: {
      general: Number(promedio(comunas.map((fila) => fila.valor)).toFixed(1)),
      mejorComuna: mejor,
      dimensionCritica,
      brechaGenero: { ...brechaMayor, valor: Number(Math.abs(brechaMayor.hombres - brechaMayor.mujeres).toFixed(1)) },
    },
  };
}

async function registrarRegistroIndividual({ communityId, year, quarter, conocimiento, uso, educacion, prevision, icaHombres, icaMujeres, userId, campusId }) {
  const [comunidades] = await pool.query(
    'SELECT community_id FROM community WHERE community_id = ? AND campus_id = ? AND status = 1',
    [communityId, campusId],
  );
  if (!comunidades.length) throw new Error('COMUNIDAD_NO_ENCONTRADA');

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [carga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, 1, 1, ?)`,
      [MODULE_ICA, SOURCE_TYPE_INDIVIDUAL, 'Registro individual', userId],
    );
    await conexion.query(
      `INSERT INTO ica_measurement
       (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [communityId, carga.insertId, year, quarter, conocimiento, uso, educacion, prevision, icaHombres, icaMujeres],
    );
    await conexion.commit();
    return { dataLoadId: carga.insertId };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}


function rutaArchivo(dataLoadId, nombreOriginal) {
  const extension = path.extname(nombreOriginal) || '.xlsx';
  return path.join(UPLOAD_DIR, `${dataLoadId}${extension}`);
}



function guardarArchivoEnDisco(buffer, dataLoadId, nombreOriginal) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(rutaArchivo(dataLoadId, nombreOriginal), buffer);
}


function borrarArchivoSiExiste(dataLoadId, nombreOriginal) {
  try {
    const ruta = rutaArchivo(dataLoadId, nombreOriginal);
    if (fs.existsSync(ruta)) {
      fs.unlinkSync(ruta);
    }
  } catch (err) {
    console.error('No se pudo limpiar el archivo huérfano:', err);
  }
}

async function registrarCargaPorArchivo({ filasValidas, campusId, quarter, year, userId, nombreArchivo, buffer }) {
  const { filasConId, noEncontradas } = await resolverComunidades(filasValidas, campusId);

  if (filasConId.length === 0) {
    const err = new Error('COMUNIDADES_NO_ENCONTRADAS');
    err.detalle = noEncontradas;
    throw err;
  }

  const conexion = await pool.getConnection();
  let dataLoadId;

  try {
    await conexion.beginTransaction();

    const [resultCarga] = await conexion.query(
      `INSERT INTO data_load (module, source_type, file_name, total_rows, status, created_modified_by)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [MODULE_ICA, SOURCE_TYPE_ARCHIVO, nombreArchivo, filasConId.length, userId],
    );
    dataLoadId = resultCarga.insertId;

    
    try {
      guardarArchivoEnDisco(buffer, dataLoadId, nombreArchivo);
    } catch (errArchivo) {
      console.error('No se pudo guardar el archivo en disco:', errArchivo);
      throw new Error('ARCHIVO_NO_GUARDADO');
    }

    for (const fila of filasConId) {
      await conexion.query(
        `INSERT INTO ica_measurement
           (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [fila.communityId, dataLoadId, year, quarter, fila.conocimiento, fila.uso, fila.educacion, fila.prevision, fila.icaHombres, fila.icaMujeres],
      );
    }

    await conexion.commit();
    return { dataLoadId, totalInsertados: filasConId.length, noEncontradas };
  } catch (err) {
    await conexion.rollback();
    // Si el archivo ya se había escrito y falló algo después lo borramos para no dejarlo huérfano.
    if (dataLoadId && err.message !== 'ARCHIVO_NO_GUARDADO') {
      borrarArchivoSiExiste(dataLoadId, nombreArchivo);
    }
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = {
  parsearArchivoIca,
  validarFilas,
  registrarCargaPorArchivo,
  obtenerComunidadesPorSede,
  obtenerHistorial,
  obtenerDashboard,
  registrarRegistroIndividual,
};