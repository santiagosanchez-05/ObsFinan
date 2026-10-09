const pool = require('../../config/db');
const { MODULO, ESTADO_CARGA } = require('../../config/estados');
const { calcularIndicesSpe } = require('./spe.indices.service');


const ESTADO_DESTINO = {
  aprobada: ESTADO_CARGA.APROBADA,
  rechazada: ESTADO_CARGA.RECHAZADA,
};

// ============================================================
// US62 — Configuración de respuestas SPE
// ============================================================

const SECCIONES = [
  {
    grupo: '1. Perfil de la empresa',
    campos: [
      ['s1_department', 'Departamento'],
      ['s1_export_sector', 'Sector exportador'],
      ['s1_export_sector_other', 'Otro sector'],
      ['s1_company_size', 'Tamaño de la empresa'],
      ['s1_years_exporting', 'Años exportando'],
      ['s1_markets_served', 'Mercados atendidos'],
      ['s1_export_income_share', 'Exportaciones sobre ingresos'],
      ['s1_main_destination', 'Destino principal'],
      ['s1_main_destination_other', 'Otro destino'],
    ],
  },
  {
    grupo: '2. Expectativas económicas',
    campos: [
      ['s2_bolivia_economy_score', 'Economía de Bolivia (1-5)'],
      ['s2_company_economy_score', 'Economía de la empresa (1-5)'],
      ['s2_export_sector_score', 'Sector exportador (1-5)'],
      ['s2_gdp_expectation', 'Expectativa del PIB'],
      ['s2_inflation_expectation', 'Expectativa de inflación'],
      ['s2_exchange_rate_expectation', 'Expectativa del tipo de cambio'],
      ['s2_company_exports_expectation', 'Expectativa de exportaciones de la empresa'],
    ],
  },
  {
    grupo: '3. Mercados y promoción',
    campos: [
      ['s3_plans_new_markets', 'Planea nuevos mercados'],
      ['s3_expansion_priority_score', 'Prioridad de expansión (1-5)'],
      ['s3_market_analysis_frequency', 'Frecuencia de análisis de mercado'],
      ['s3_access_modality', 'Modalidad de acceso'],
      ['s3_access_modality_other', 'Otra modalidad'],
      ['s3_attended_trade_fairs', 'Asistió a ferias comerciales'],
      ['s3_plans_trade_promotion', 'Planea promoción comercial'],
    ],
  },
  {
    grupo: '4. Competitividad y certificaciones',
    campos: [
      ['s4_price_score', 'Precio (1-5)'],
      ['s4_quality_score', 'Calidad (1-5)'],
      ['s4_innovation_score', 'Innovación (1-5)'],
      ['s4_value_added_score', 'Valor agregado (1-5)'],
      ['s4_deadlines_score', 'Plazos de entrega (1-5)'],
      ['s4_customer_service_score', 'Atención al cliente (1-5)'],
      ['s4_sustainability_score', 'Sostenibilidad (1-5)'],
      ['s4_value_added_share', 'Participación del valor agregado'],
      ['s4_has_certifications', 'Tiene certificaciones'],
      ['s4_cert_other_text', 'Otra certificación'],
    ],
    multiples: [
      {
        titulo: 'Certificaciones',
        campos: [
          ['s4_cert_iso', 'ISO'],
          ['s4_cert_organic', 'Orgánica'],
          ['s4_cert_fair_trade', 'Comercio justo'],
          ['s4_cert_haccp', 'HACCP'],
          ['s4_cert_other', 'Otra'],
        ],
      },
    ],
  },
  {
    grupo: '5. Acuerdos, barreras y logística',
    campos: [
      ['s5_best_trade_agreement', 'Mejor acuerdo comercial'],
      ['s5_best_trade_agreement_other', 'Otro acuerdo'],
      ['s5_uses_tariff_preferences', 'Usa preferencias arancelarias'],
      ['s5_main_export_barrier', 'Principal barrera para exportar'],
      ['s5_intl_logistics_score', 'Logística internacional (1-5)'],
      ['s5_intl_transport_score', 'Transporte internacional (1-5)'],
      ['s5_customs_clearance_score', 'Despacho aduanero (1-5)'],
      ['s5_logistics_costs_score', 'Costos logísticos (1-5)'],
      ['s5_logistics_infrastructure_score', 'Infraestructura logística (1-5)'],
      ['s5_trade_facilitation_score', 'Facilitación comercial (1-5)'],
      ['s5_main_competitive_advantage', 'Principal ventaja competitiva'],
      ['s5_main_competitive_weakness', 'Principal debilidad competitiva'],
    ],
  },
  {
    grupo: '6. Financiamiento, divisas y regulación',
    campos: [
      ['s6_financing_access_score', 'Acceso a financiamiento (1-5)'],
      ['s6_business_liquidity_score', 'Liquidez del negocio (1-5)'],
      ['s6_fx_availability_score', 'Disponibilidad de divisas (1-5)'],
      ['s6_fx_shortage_impact', 'Impacto de la escasez de divisas'],
      ['s6_main_financing_source', 'Fuente principal de financiamiento'],
    ],
    multiples: [
      {
        titulo: 'Instrumentos que utiliza',
        campos: [
          ['s6_instr_trade_agreements', 'Acuerdos comerciales'],
          ['s6_instr_sgp', 'SGP'],
          ['s6_instr_tariff_refund', 'Devolución de aranceles'],
          ['s6_instr_trading_companies', 'Trading companies'],
          ['s6_instr_regional_regulations', 'Normativa regional'],
          ['s6_instr_none', 'Ninguno'],
        ],
      },
      {
        titulo: 'Regulaciones que lo afectan',
        campos: [
          ['s6_reg_exchange_controls', 'Control de cambios'],
          ['s6_reg_export_restrictions', 'Restricciones a la exportación'],
          ['s6_reg_non_tariff_measures', 'Medidas no arancelarias'],
          ['s6_reg_export_taxes', 'Impuestos a la exportación'],
          ['s6_reg_regulatory_uncertainty', 'Incertidumbre regulatoria'],
          ['s6_reg_complex_customs', 'Trámites aduaneros complejos'],
        ],
      },
    ],
  },
  {
    grupo: '7. Entorno institucional',
    campos: [
      ['s7_legal_certainty_score', 'Seguridad jurídica (1-5)'],
      ['s7_regulatory_stability_score', 'Estabilidad regulatoria (1-5)'],
      ['s7_institutional_transparency_score', 'Transparencia institucional (1-5)'],
      ['s7_policy_predictability_score', 'Previsibilidad de políticas (1-5)'],
      ['s7_highest_impact_measure', 'Medida de mayor impacto'],
    ],
  },
  {
    grupo: '8. Inversión',
    campos: [
      ['s8_invested_last_12m', 'Invirtió en los últimos 12 meses'],
      ['s8_will_invest_next_12m', 'Invertirá en los próximos 12 meses'],
      ['s8_reason_to_invest', 'Razón para invertir'],
      ['s8_reason_not_to_invest', 'Razón para no invertir'],
      ['s8_macro_stability_score', 'Estabilidad macroeconómica (1-5)'],
      ['s8_fx_access_score', 'Acceso a divisas (1-5)'],
      ['s8_financing_score', 'Financiamiento (1-5)'],
      ['s8_legal_certainty_score', 'Seguridad jurídica (1-5)'],
      ['s8_simpler_procedures_score', 'Trámites más simples (1-5)'],
      ['s8_new_trade_agreements_score', 'Nuevos acuerdos comerciales'],
      ['s8_logistics_improvement_score', 'Mejora logística (1-5)'],
      ['s8_new_markets_score', 'Nuevos mercados (1-5)'],
    ],
  },
];

// ============================================================
// US62 — Funciones para construir el panel "Revisar"
// ============================================================

// Campos de texto libre / "otro".
// Si están vacíos, no se muestran.
const esOpcional = (columna) => /(_other|_text)$|^s8_reason/.test(columna);

const vacio = (valor) =>
  valor === null || valor === undefined || valor === '';

function armarRespuestas(fila) {
  return SECCIONES.map(({ grupo, campos, multiples = [] }) => {
    const items = [];

    for (const [columna, etiqueta] of campos) {
      const valor = fila[columna];

      if (vacio(valor)) {
        if (!esOpcional(columna)) {
          items.push([etiqueta, '—']);
        }

        continue;
      }

      items.push([etiqueta, String(valor)]);
    }

    for (const { titulo, campos: banderas } of multiples) {
      const marcados = banderas
        .filter(([columna]) => Number(fila[columna]) === 1)
        .map(([, etiqueta]) => etiqueta);

      items.push([
        titulo,
        marcados.length ? marcados.join(', ') : '—',
      ]);
    }

    return {
      grupo,
      items,
    };
  });
}

// ============================================================
// US62 — Bandeja de aprobaciones SPE
// ============================================================

// Cargas SPE pendientes (data_load.status = PENDIENTE),
// las más antiguas primero.
//
// Cada carga es UNA encuesta individual (la carga por archivo se quitó) y
// trae sus respuestas para el panel "Revisar".
async function obtenerPendientesSpe() {
  const [filas] = await pool.query(
    `SELECT dl.data_load_id,
            dl.source_type,
            dl.file_name,
            dl.created_at,
            u.first_name,
            u.paternal_last_name,
            u.maternal_last_name,
            camp.campus_name AS sede,
            MIN(e.title) AS evento,
            GROUP_CONCAT(
              DISTINCT sr.s1_export_sector
              SEPARATOR '||'
            ) AS sectores,
            GROUP_CONCAT(
              DISTINCT sr.s1_department
              SEPARATOR '||'
            ) AS departamentos,
            MIN(sr.year) AS year,
            MIN(sr.semester) AS semester,
            COUNT(
              DISTINCT CONCAT(sr.year, '-', sr.semester)
            ) AS num_periodos,
            COUNT(sr.spe_survey_response_id) AS total_registros
       FROM data_load dl
       INNER JOIN spe_survey_response sr
         ON sr.data_load_id = dl.data_load_id
        AND sr.status = 1
       LEFT JOIN user u
         ON u.user_id = dl.created_modified_by
       LEFT JOIN campus camp
         ON camp.campus_id = u.campus_id
       LEFT JOIN event e
         ON e.event_id = sr.event_id
      WHERE dl.module = ?
        AND dl.status = ?
      GROUP BY dl.data_load_id,
               dl.source_type,
               dl.file_name,
               dl.created_at,
               u.first_name,
               u.paternal_last_name,
               u.maternal_last_name,
               camp.campus_name
      ORDER BY dl.created_at ASC,
               dl.data_load_id ASC`,
    [
      MODULO.SPE,
      ESTADO_CARGA.PENDIENTE,
    ],
  );

  // Respuestas completas de todas las cargas pendientes
  // en una sola consulta.
  const respuestasPorCarga = new Map();

  if (filas.length) {
    const [respuestas] = await pool.query(
      `SELECT *
         FROM spe_survey_response
        WHERE data_load_id IN (?)
          AND status = 1`,
      [
        filas.map((fila) => fila.data_load_id),
      ],
    );

    respuestas.forEach((respuesta) => {
      if (!respuestasPorCarga.has(respuesta.data_load_id)) {
        respuestasPorCarga.set(
          respuesta.data_load_id,
          [],
        );
      }

      respuestasPorCarga
        .get(respuesta.data_load_id)
        .push(respuesta);
    });
  }

  const pendientes = filas.map((fila) => {
    const detalle =
      respuestasPorCarga.get(fila.data_load_id) || [];

    return {
      id: fila.data_load_id,

      tipo: 'manual',

      origen: 'Registro individual',

      zonas: (
        fila.sectores
          ? fila.sectores.split('||')
          : []
      ).sort(),

      // Departamento donde se hizo la encuesta (s1_department)
      departamento:
        (fila.departamentos
          ? fila.departamentos.split('||').sort().join(', ')
          : '') || '-',

      periodo:
        Number(fila.num_periodos) === 1
          ? `${fila.semester}S ${fila.year}`
          : 'Varios períodos',

      registros: Number(fila.total_registros),

      encuestador:
        [
          fila.first_name,
          fila.paternal_last_name,
          fila.maternal_last_name,
        ]
          .filter(Boolean)
          .join(' ') || 'Usuario del sistema',

      sede: fila.sede || '-',

      fecha: fila.created_at,

      evento: fila.evento || 'Sin evento (registro directo)',

      respuestas: detalle.length
        ? armarRespuestas(detalle[0])
        : [],
    };
  });

  return {
    pendientes,
    total: pendientes.length,
  };
}

// ============================================================
// US62 — Aprobar / rechazar carga SPE
// ============================================================

// Aprueba o rechaza una carga SPE pendiente.
//
// Errores:
//   CARGA_NO_ENCONTRADA -> 404 en controller
//   CARGA_YA_REVISADA  -> 409 en controller
async function cambiarEstadoCargaSpe({
  dataLoadId,
  estado,
  motivo,
  revisorId,
}) {
  const nuevoEstado = ESTADO_DESTINO[estado];

  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    // FOR UPDATE evita que dos superadmins
    // resuelvan la misma carga al mismo tiempo.
    const [cargas] = await conexion.query(
      `SELECT data_load_id,
              status
         FROM data_load
        WHERE data_load_id = ?
          AND module = ?
          AND status != 0
        FOR UPDATE`,
      [
        dataLoadId,
        MODULO.SPE,
      ],
    );

    if (!cargas.length) {
      throw new Error('CARGA_NO_ENCONTRADA');
    }

    if (
      Number(cargas[0].status) !==
      ESTADO_CARGA.PENDIENTE
    ) {
      throw new Error('CARGA_YA_REVISADA');
    }

    const nota =
      estado === 'rechazada'
        ? (typeof motivo === 'string' ? motivo.trim() : '') || null
        : null;

    await conexion.query(
      `UPDATE data_load
          SET status = ?,
              reviewed_by = ?,
              reviewed_at = NOW(),
              review_note = ?
        WHERE data_load_id = ?`,
      [nuevoEstado, revisorId, nota, dataLoadId],
    );

    if (estado === 'aprobada') {
      await calcularIndicesSpe(dataLoadId, conexion);
    }

    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }

  return {
    id: dataLoadId,
    estado,
  };
}

module.exports = {
  obtenerPendientesSpe,
  cambiarEstadoCargaSpe,
};