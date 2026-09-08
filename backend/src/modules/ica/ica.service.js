const xlsx = require('xlsx');
const pool = require('../../config/db');
const { filaIcaSchema, ENCABEZADOS_ESPERADOS } = require('./ica.validation');

// Convierte "64,47" / 64.47 / null en number, o null si no se puede.
function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.').trim());
  return Number.isFinite(numero) ? numero : null;
}

// Lee el Excel y devuelve las filas como objetos simples, sin validar todavía.
function parsearArchivoIca(buffer) {
  const libro = xlsx.read(buffer, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: null });

  // Fila 0 = título, fila 1 = encabezados.
  const encabezados = (filas[1] || []).slice(0, 5).map((h) => String(h || '').trim());
  const encabezadosOk = ENCABEZADOS_ESPERADOS.every((esperado, i) => encabezados[i] === esperado);
  if (!encabezadosOk) {
    const err = new Error('ENCABEZADOS_INVALIDOS');
    err.detalle = { esperado: ENCABEZADOS_ESPERADOS, recibido: encabezados };
    throw err;
  }

  // Datos desde la fila 3; cortamos en la primera fila vacía.
  const datos = [];
  for (let i = 2; i < filas.length; i++) {
    const fila = filas[i] || [];
    const comuna = fila[0];
    if (comuna === null || comuna === undefined || String(comuna).trim() === '') break;

    datos.push({
      filaExcel: i + 1,
      comuna: String(comuna).trim(),
      conocimiento: aNumero(fila[1]),
      uso: aNumero(fila[2]),
      educacion: aNumero(fila[3]),
      prevision: aNumero(fila[4]),
      icaHombres: aNumero(fila[8]), // segunda tabla de la hoja
      icaMujeres: aNumero(fila[9]),
    });
  }

  if (datos.length === 0) {
    throw new Error('ARCHIVO_SIN_FILAS');
  }

  return datos;
}

// Valida cada fila y separa las buenas de las que tienen error, sin frenar todo por una sola fila mala.
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

// Inserta el archivo (data_load) y sus filas (ica_record) en una sola transacción.
async function registrarCargaPorArchivo({ filasValidas, campusId, quarter, year, userId, nombreArchivo }) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [resultCarga] = await conexion.query(
      `INSERT INTO data_load (module, load_type, file_name, uploaded_by, campus_id, quarter, year, total_rows, status)
       VALUES ('ICA', 'archivo', ?, ?, ?, ?, ?, ?, 1)`,
      [nombreArchivo, userId, campusId, quarter, year, filasValidas.length],
    );
    const dataLoadId = resultCarga.insertId;

    for (const fila of filasValidas) {
      await conexion.query(
        `INSERT INTO ica_record
           (data_load_id, campus_id, quarter, year, comuna, conocimiento, uso, educacion, prevision, ica_hombres, ica_mujeres, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [dataLoadId, campusId, quarter, year, fila.comuna, fila.conocimiento, fila.uso, fila.educacion, fila.prevision, fila.icaHombres, fila.icaMujeres],
      );
    }

    await conexion.commit();
    return { dataLoadId, totalInsertados: filasValidas.length };
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { parsearArchivoIca, validarFilas, registrarCargaPorArchivo };