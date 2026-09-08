const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaIcaSchema, ENCABEZADOS_ESPERADOS } = require('./ica.validation');

// module: 1=ICA, 2=SPE; source_type: 1=individual, 2=archivo
const MODULE_ICA = 1;
const SOURCE_TYPE_ARCHIVO = 2;

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

// Calcula dónde debe vivir el archivo físico de una carga: {data_load_id}.{extensión}.
// Se separa de guardarArchivoEnDisco porque también la necesita borrarArchivoSiExiste.
function rutaArchivo(dataLoadId, nombreOriginal) {
  const extension = path.extname(nombreOriginal) || '.xlsx';
  return path.join(UPLOAD_DIR, `${dataLoadId}${extension}`);
}

// Escribe el archivo a disco usando el data_load_id como nombre así no hay colisión de nombres

function guardarArchivoEnDisco(buffer, dataLoadId, nombreOriginal) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(rutaArchivo(dataLoadId, nombreOriginal), buffer);
}

// Si algo falla después de haber escrito el archivo,
// lo borramos para no dejar un .xlsx huérfano sin su data_load correspondiente
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

    
    // Si falla el guarado de archivo se hace rollback de los datos.
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

module.exports = { parsearArchivoIca, validarFilas, registrarCargaPorArchivo };