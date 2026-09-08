const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaIcaSchema, ENCABEZADOS_ESPERADOS } = require('./ica.validation');

// TODO(equipo): confirmar los valores reales de estos tinyint.
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

    datos.push({
      filaExcel: i + 1,
      comuna: String(comuna).trim(),
      conocimiento: aNumero(fila[1]),
      uso: aNumero(fila[2]),
      educacion: aNumero(fila[3]),
      prevision: aNumero(fila[4]),
      icaHombres: aNumero(fila[8]),
      icaMujeres: aNumero(fila[9]),
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

// Escribe el archivo a disco usando el data_load_id como nombre — así nunca hay
// colisión de nombres, sin importar cómo se llamaba el archivo original.
function guardarArchivoEnDisco(buffer, dataLoadId, nombreOriginal) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const extension = path.extname(nombreOriginal) || '.xlsx';
  const rutaDestino = path.join(UPLOAD_DIR, `${dataLoadId}${extension}`);
  fs.writeFileSync(rutaDestino, buffer);
  return rutaDestino;
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

    for (const fila of filasConId) {
      await conexion.query(
        `INSERT INTO ica_measurement
           (community_id, data_load_id, year, quarter, knowledge_index, usage_index, education_index, foresight_index, ica_male, ica_female, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [fila.communityId, dataLoadId, year, quarter, fila.conocimiento, fila.uso, fila.educacion, fila.prevision, fila.icaHombres, fila.icaMujeres],
      );
    }

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }

  // El archivo se guarda recién después del commit: si esto falla, la carga
  // de datos ya quedó bien en la BD, solo no se podrá descargar el Excel original.
  let archivoGuardado = true;
  try {
    guardarArchivoEnDisco(buffer, dataLoadId, nombreArchivo);
  } catch (err) {
    console.error('No se pudo guardar el archivo en disco:', err);
    archivoGuardado = false;
  }

  return { dataLoadId, totalInsertados: filasConId.length, noEncontradas, archivoGuardado };
}

module.exports = { parsearArchivoIca, validarFilas, registrarCargaPorArchivo };