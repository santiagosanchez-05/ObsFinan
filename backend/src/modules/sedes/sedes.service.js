const pool = require("../../config/db");

function obtenerInicioMeses(cantidad) {
  const ahora = new Date();

  return new Date(ahora.getFullYear(), ahora.getMonth() - cantidad + 1, 1);
}

async function obtenerSedes() {
  const [rows] = await pool.query(`
    SELECT
      campus_id,
      campus_name,
      campus_code
    FROM campus
    WHERE status = 1
    ORDER BY campus_name ASC
  `);

  return rows;
}

async function obtenerUsuariosPorSede() {
  const [rows] = await pool.query(`
    SELECT
      u.campus_id,
      COUNT(*) AS usuarios,
      SUM(
        CASE
          WHEN r.role_name = 'cliente' THEN 1
          ELSE 0
        END
      ) AS clientes,
      SUM(
        CASE
          WHEN r.role_name = 'admin' THEN 1
          ELSE 0
        END
      ) AS admins
    FROM user u
    INNER JOIN role r
      ON r.role_id = u.role_id
    WHERE u.status = 1
      AND r.status = 1
      AND r.role_name IN ('admin', 'cliente')
    GROUP BY u.campus_id
  `);

  return rows;
}

async function obtenerRegistrosPorSede() {
  const [rows] = await pool.query(`
    SELECT
      u.campus_id,
      COALESCE(SUM(dl.total_rows), 0) AS registros,
      COUNT(dl.data_load_id) AS datasets,
      MAX(dl.created_at) AS ultima_actividad
    FROM data_load dl
    INNER JOIN user u
      ON u.user_id = dl.created_modified_by
    INNER JOIN campus c
      ON c.campus_id = u.campus_id
    WHERE dl.status = 1
      AND u.status = 1
      AND c.status = 1
    GROUP BY u.campus_id
  `);

  return rows;
}

async function obtenerRegistrosPorMes() {
  const inicio = obtenerInicioMeses(6);

  const [rows] = await pool.query(
    `
      SELECT
        u.campus_id,
        YEAR(dl.created_at) AS anio,
        MONTH(dl.created_at) AS mes_numero,
        COALESCE(SUM(dl.total_rows), 0) AS registros
      FROM data_load dl
      INNER JOIN user u
        ON u.user_id = dl.created_modified_by
      INNER JOIN campus c
        ON c.campus_id = u.campus_id
      WHERE dl.status = 1
        AND u.status = 1
        AND c.status = 1
        AND dl.created_at >= ?
      GROUP BY
        u.campus_id,
        YEAR(dl.created_at),
        MONTH(dl.created_at)
      ORDER BY
        anio ASC,
        mes_numero ASC
    `,
    [inicio],
  );

  return rows;
}

async function obtenerAdministradores() {
  const [rows] = await pool.query(`
    SELECT
      u.user_id,
      u.campus_id,
      u.first_name,
      u.paternal_last_name,
      u.maternal_last_name,
      u.email,
      COUNT(dl.data_load_id) AS datasets,
      COALESCE(SUM(dl.total_rows), 0) AS registros,
      MAX(dl.created_at) AS ultima_actividad
    FROM user u
    INNER JOIN role r
      ON r.role_id = u.role_id
    INNER JOIN campus c
      ON c.campus_id = u.campus_id
    LEFT JOIN data_load dl
      ON dl.created_modified_by = u.user_id
      AND dl.status = 1
    WHERE u.status = 1
      AND r.status = 1
      AND r.role_name = 'admin'
      AND c.status = 1
    GROUP BY
      u.user_id,
      u.campus_id,
      u.first_name,
      u.paternal_last_name,
      u.maternal_last_name,
      u.email
    ORDER BY
      u.first_name ASC,
      u.paternal_last_name ASC
  `);

  return rows;
}

function generarSerieMensual(campusId, registrosPorMes) {
  const mapa = new Map();

  for (const row of registrosPorMes) {
    if (Number(row.campus_id) !== Number(campusId)) {
      continue;
    }

    const clave = `${Number(row.anio)}-${Number(row.mes_numero)}`;

    mapa.set(clave, Number(row.registros));
  }

  const ahora = new Date();
  const resultado = [];

  for (let i = 5; i >= 0; i -= 1) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);

    const anio = fecha.getFullYear();
    const mesNumero = fecha.getMonth() + 1;
    const clave = `${anio}-${mesNumero}`;

    const mes = fecha
      .toLocaleDateString("es-BO", {
        month: "short",
      })
      .replace(".", "");

    resultado.push({
      mes,
      registros: Number(mapa.get(clave) || 0),
    });
  }

  return resultado;
}

function formatearFecha(fecha) {
  if (!fecha) {
    return null;
  }

  const fechaObjeto = new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) {
    return null;
  }

  return fechaObjeto.toISOString();
}

async function obtenerEstadisticas() {
  const [
    sedes,
    usuariosPorSede,
    registrosPorSede,
    registrosPorMes,
    administradores,
  ] = await Promise.all([
    obtenerSedes(),
    obtenerUsuariosPorSede(),
    obtenerRegistrosPorSede(),
    obtenerRegistrosPorMes(),
    obtenerAdministradores(),
  ]);

  const usuariosMap = new Map();

  for (const row of usuariosPorSede) {
    usuariosMap.set(Number(row.campus_id), {
      usuarios: Number(row.usuarios),
      clientes: Number(row.clientes),
      admins: Number(row.admins),
    });
  }

  const registrosMap = new Map();

  for (const row of registrosPorSede) {
    registrosMap.set(Number(row.campus_id), {
      registros: Number(row.registros),
      datasets: Number(row.datasets),
      ultimaActividad: formatearFecha(row.ultima_actividad),
    });
  }

  const adminsPorSede = new Map();

  for (const admin of administradores) {
    const campusId = Number(admin.campus_id);

    if (!adminsPorSede.has(campusId)) {
      adminsPorSede.set(campusId, []);
    }

    const nombreCompleto = [
      admin.first_name,
      admin.paternal_last_name,
      admin.maternal_last_name,
    ]
      .filter(Boolean)
      .join(" ");

    adminsPorSede.get(campusId).push({
      id: Number(admin.user_id),
      nombre: nombreCompleto,
      correo: admin.email,
      datasets: Number(admin.datasets),
      registros: Number(admin.registros),
      ultimaActividad: formatearFecha(admin.ultima_actividad),
    });
  }

  const detalle = {};
  const resumen = [];

  for (const sede of sedes) {
    const campusId = Number(sede.campus_id);

    const usuarios = usuariosMap.get(campusId) || {
      usuarios: 0,
      clientes: 0,
      admins: 0,
    };

    const registros = registrosMap.get(campusId) || {
      registros: 0,
      datasets: 0,
      ultimaActividad: null,
    };

    const sedeDetalle = {
      id: campusId,
      nombre: sede.campus_name,
      codigo: sede.campus_code,

      kpis: {
        usuarios: {
          value: usuarios.usuarios,
        },

        clientes: {
          value: usuarios.clientes,
        },

        admins: {
          value: usuarios.admins,
        },

        registros: {
          value: registros.registros,
        },
      },

      datasets: registros.datasets,

      ultimaActividad: registros.ultimaActividad,

      registrosPorMes: generarSerieMensual(campusId, registrosPorMes),

      admins: adminsPorSede.get(campusId) || [],
    };

    detalle[String(campusId)] = sedeDetalle;

    resumen.push({
      id: String(campusId),
      sede: sede.campus_name,
      codigo: sede.campus_code,
      usuarios: usuarios.usuarios,
      clientes: usuarios.clientes,
      admins: usuarios.admins,
      registros: registros.registros,
      datasets: registros.datasets,
      actividad: registros.ultimaActividad,
    });
  }

  const totalUsuarios = sedes.reduce(
    (total, sede) =>
      total + (usuariosMap.get(Number(sede.campus_id))?.usuarios || 0),
    0,
  );

  const totalClientes = sedes.reduce(
    (total, sede) =>
      total + (usuariosMap.get(Number(sede.campus_id))?.clientes || 0),
    0,
  );

  const totalAdmins = sedes.reduce(
    (total, sede) =>
      total + (usuariosMap.get(Number(sede.campus_id))?.admins || 0),
    0,
  );

  const totalRegistros = sedes.reduce(
    (total, sede) =>
      total + (registrosMap.get(Number(sede.campus_id))?.registros || 0),
    0,
  );

  const totalDatasets = sedes.reduce(
    (total, sede) =>
      total + (registrosMap.get(Number(sede.campus_id))?.datasets || 0),
    0,
  );

  let ultimaActividadGlobal = null;

  for (const sede of sedes) {
    const actividad =
      registrosMap.get(Number(sede.campus_id))?.ultimaActividad || null;

    if (!actividad) {
      continue;
    }

    if (
      !ultimaActividadGlobal ||
      new Date(actividad) > new Date(ultimaActividadGlobal)
    ) {
      ultimaActividadGlobal = actividad;
    }
  }

  return {
    sedes: sedes.map((sede) => ({
      id: String(sede.campus_id),
      label: sede.campus_name,
      code: sede.campus_code,
    })),

    global: {
      usuarios: {
        value: totalUsuarios,
      },

      clientes: {
        value: totalClientes,
      },

      admins: {
        value: totalAdmins,
      },

      registros: {
        value: totalRegistros,
      },

      datasets: {
        value: totalDatasets,
      },

      ultimaActividad: ultimaActividadGlobal,
    },

    resumen,

    detalle,
  };
}

module.exports = {
  obtenerEstadisticas,
};
