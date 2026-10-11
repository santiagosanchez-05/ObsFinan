// frontend/src/views/diccionario-KevinAlanes/pages/DiccionarioPage.jsx
// Kevin Alanes — US48 (diccionario de variables). Página pública.
import { useState } from "react";
import { BookOpen, Search } from "lucide-react";

// ==========================================================================
// DATOS DEL DICCIONARIO (nombres reales de la BD: observeratiofinanciero_v1)
// ==========================================================================
const DATASETS = {
  ICA: {
    titulo: "ICA — Índice de Calidad Aseguradora",
    descripcion:
      "Tabla ica_measurement. Encuesta trimestral aplicada en comunas de las sedes de Univalle.",
    variables: [
      {
        nombre: "ica_measurement_id",
        tipo: "INT (PK)",
        descripcion: "Identificador único de la medición.",
      },
      {
        nombre: "community_id",
        tipo: "INT (FK)",
        descripcion: "ID de la comuna donde se aplicó la encuesta.",
      },
      {
        nombre: "data_load_id",
        tipo: "INT (FK)",
        descripcion: "ID de la carga de datos asociada.",
      },
      {
        nombre: "year",
        tipo: "INT",
        descripcion: "Año de la medición (ej. 2026).",
      },
      {
        nombre: "quarter",
        tipo: "TINYINT (1-4)",
        descripcion: "Trimestre del año (1=Q1, 2=Q2, 3=Q3, 4=Q4).",
      },
      {
        nombre: "knowledge_index",
        tipo: "DECIMAL(5,2)",
        descripcion: "Puntaje de la dimensión Conocimiento financiero (0-100).",
      },
      {
        nombre: "usage_index",
        tipo: "DECIMAL(5,2)",
        descripcion:
          "Puntaje de la dimensión Uso de productos financieros (0-100).",
      },
      {
        nombre: "education_index",
        tipo: "DECIMAL(5,2)",
        descripcion: "Puntaje de la dimensión Educación financiera (0-100).",
      },
      {
        nombre: "foresight_index",
        tipo: "DECIMAL(5,2)",
        descripcion:
          "Puntaje de la dimensión Previsión / planificación futura (0-100).",
      },
      {
        nombre: "ica_male",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice ICA calculado solo para hombres (puede ser NULL).",
      },
      {
        nombre: "ica_female",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice ICA calculado solo para mujeres (puede ser NULL).",
      },
      {
        nombre: "status",
        tipo: "TINYINT",
        descripcion: "1 = activo, 0 = inactivo/eliminado.",
      },
    ],
  },
  SPE: {
    titulo: "SPE — Sector Privado Exportador",
    descripcion:
      "Tabla spe_survey_response. Encuesta semestral SOCOMEX–SOCIFIN a empresas exportadoras bolivianas (8 secciones, ~70 preguntas).",
    variables: [
      // Metadata
      {
        nombre: "spe_survey_response_id",
        tipo: "INT (PK)",
        descripcion: "Identificador único de la respuesta.",
      },
      {
        nombre: "data_load_id",
        tipo: "INT (FK)",
        descripcion: "ID de la carga de datos (individual o archivo).",
      },
      { nombre: "year", tipo: "INT (FK)", descripcion: "Año de la encuesta." },
      {
        nombre: "semester",
        tipo: "TINYINT (1-2)",
        descripcion: "Semestre: 1 = primero, 2 = segundo.",
      },
      {
        nombre: "surveyor_user_id",
        tipo: "INT (FK)",
        descripcion: "ID del encuestador que levantó la encuesta.",
      },
      {
        nombre: "event_id",
        tipo: "INT (FK)",
        descripcion: "ID del evento donde se aplicó (puede ser NULL).",
      },

      // Sección I — Caracterización empresarial
      {
        nombre: "s1_department",
        tipo: "ENUM",
        descripcion:
          "Sección I · Departamento: Santa Cruz, La Paz o Cochabamba.",
      },
      {
        nombre: "s1_export_sector",
        tipo: "ENUM",
        descripcion:
          "Sección I · Sector exportador (Agroindustria, Alimentos, Manufactura, etc.).",
      },
      {
        nombre: "s1_export_sector_other",
        tipo: "VARCHAR(150)",
        descripcion: 'Sección I · Especificación si el sector es "Otro".',
      },
      {
        nombre: "s1_company_size",
        tipo: "ENUM",
        descripcion: "Sección I · Tamaño: Micro, Pequeña, Mediana o Grande.",
      },
      {
        nombre: "s1_years_exporting",
        tipo: "ENUM",
        descripcion:
          "Sección I · Años exportando (Menos de 5, 6 a 10, 11 a 20, Más de 20).",
      },
      {
        nombre: "s1_markets_served",
        tipo: "ENUM",
        descripcion:
          "Sección I · Número de mercados internacionales atendidos.",
      },
      {
        nombre: "s1_export_income_share",
        tipo: "ENUM",
        descripcion:
          "Sección I · Porcentaje de ingresos proveniente de exportaciones.",
      },
      {
        nombre: "s1_main_destination",
        tipo: "ENUM",
        descripcion:
          "Sección I · Principal mercado de destino (CAN, MERCOSUR, Norteamérica, etc.).",
      },
      {
        nombre: "s1_main_destination_other",
        tipo: "VARCHAR(150)",
        descripcion: 'Sección I · Especificación si el destino es "Otros".',
      },

      // Sección II — Situación económica y expectativas
      {
        nombre: "s2_bolivia_economy_score",
        tipo: "TINYINT (1-5)",
        descripcion:
          "Sección II · Evaluación de la situación económica de Bolivia.",
      },
      {
        nombre: "s2_company_economy_score",
        tipo: "TINYINT (1-5)",
        descripcion:
          "Sección II · Evaluación de la situación económica de la empresa.",
      },
      {
        nombre: "s2_export_sector_score",
        tipo: "TINYINT (1-5)",
        descripcion:
          "Sección II · Evaluación de la situación del sector exportador.",
      },
      {
        nombre: "s2_gdp_expectation",
        tipo: "ENUM",
        descripcion: "Sección II · Expectativa de evolución del PIB.",
      },
      {
        nombre: "s2_inflation_expectation",
        tipo: "ENUM",
        descripcion: "Sección II · Expectativa de evolución de la inflación.",
      },
      {
        nombre: "s2_exchange_rate_expectation",
        tipo: "ENUM",
        descripcion:
          "Sección II · Expectativa de evolución del tipo de cambio.",
      },
      {
        nombre: "s2_company_exports_expectation",
        tipo: "ENUM",
        descripcion:
          "Sección II · Expectativa de evolución de las exportaciones propias.",
      },

      // Sección III — Internacionalización
      {
        nombre: "s3_plans_new_markets",
        tipo: "ENUM (Sí/No)",
        descripcion: "Sección III · ¿Planea ingresar a nuevos mercados?",
      },
      {
        nombre: "s3_expansion_priority_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección III · Prioridad de la expansión internacional.",
      },
      {
        nombre: "s3_market_analysis_frequency",
        tipo: "ENUM",
        descripcion:
          "Sección III · Frecuencia con que analiza mercados internacionales.",
      },
      {
        nombre: "s3_access_modality",
        tipo: "ENUM",
        descripcion:
          "Sección III · Modalidad principal para acceder a mercados.",
      },
      {
        nombre: "s3_access_modality_other",
        tipo: "VARCHAR(150)",
        descripcion: 'Sección III · Especificación si la modalidad es "Otro".',
      },
      {
        nombre: "s3_attended_trade_fairs",
        tipo: "ENUM (Sí/No)",
        descripcion:
          "Sección III · ¿Participó en ferias o misiones en los últimos 12 meses?",
      },
      {
        nombre: "s3_plans_trade_promotion",
        tipo: "ENUM (Sí/No)",
        descripcion:
          "Sección III · ¿Planea participar en promoción comercial los próximos 12 meses?",
      },

      // Sección IV — Competitividad exportadora
      {
        nombre: "s4_price_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Competitividad en precio.",
      },
      {
        nombre: "s4_quality_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Competitividad en calidad.",
      },
      {
        nombre: "s4_innovation_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Competitividad en innovación.",
      },
      {
        nombre: "s4_value_added_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Competitividad en valor agregado.",
      },
      {
        nombre: "s4_deadlines_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Cumplimiento de plazos.",
      },
      {
        nombre: "s4_customer_service_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Servicio al cliente.",
      },
      {
        nombre: "s4_sustainability_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección IV · Sostenibilidad.",
      },
      {
        nombre: "s4_value_added_share",
        tipo: "ENUM",
        descripcion:
          "Sección IV · Porcentaje de oferta exportable con valor agregado.",
      },
      {
        nombre: "s4_has_certifications",
        tipo: "ENUM (Sí/No)",
        descripcion:
          "Sección IV · ¿Cuenta con certificaciones internacionales?",
      },
      {
        nombre: "s4_cert_iso",
        tipo: "TINYINT(1)",
        descripcion: "Sección IV · Certificación ISO (1 = sí, 0 = no).",
      },
      {
        nombre: "s4_cert_organic",
        tipo: "TINYINT(1)",
        descripcion: "Sección IV · Certificación Orgánica (1 = sí, 0 = no).",
      },
      {
        nombre: "s4_cert_fair_trade",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección IV · Certificación Comercio Justo (1 = sí, 0 = no).",
      },
      {
        nombre: "s4_cert_haccp",
        tipo: "TINYINT(1)",
        descripcion: "Sección IV · Certificación HACCP (1 = sí, 0 = no).",
      },
      {
        nombre: "s4_cert_other",
        tipo: "TINYINT(1)",
        descripcion: "Sección IV · Otra certificación (1 = sí, 0 = no).",
      },
      {
        nombre: "s4_cert_other_text",
        tipo: "VARCHAR(150)",
        descripcion: "Sección IV · Especificación de otra certificación.",
      },

      // Sección V — Comercio internacional y acceso a mercados
      {
        nombre: "s5_best_trade_agreement",
        tipo: "ENUM",
        descripcion:
          "Sección V · Acuerdo comercial que más beneficia (CAN, MERCOSUR, SGP, ACE, Otro).",
      },
      {
        nombre: "s5_best_trade_agreement_other",
        tipo: "VARCHAR(150)",
        descripcion: 'Sección V · Especificación si el acuerdo es "Otro".',
      },
      {
        nombre: "s5_uses_tariff_preferences",
        tipo: "ENUM",
        descripcion:
          "Sección V · ¿Aprovecha preferencias arancelarias? (Sí/Parcialmente/No).",
      },
      {
        nombre: "s5_main_export_barrier",
        tipo: "ENUM",
        descripcion: "Sección V · Principal barrera para exportar.",
      },
      {
        nombre: "s5_intl_logistics_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de logística internacional.",
      },
      {
        nombre: "s5_intl_transport_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de transporte internacional.",
      },
      {
        nombre: "s5_customs_clearance_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de despacho aduanero.",
      },
      {
        nombre: "s5_logistics_costs_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de costos logísticos.",
      },
      {
        nombre: "s5_logistics_infrastructure_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de infraestructura logística.",
      },
      {
        nombre: "s5_trade_facilitation_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección V · Evaluación de facilitación del comercio.",
      },
      {
        nombre: "s5_main_competitive_advantage",
        tipo: "ENUM",
        descripcion: "Sección V · Principal ventaja competitiva.",
      },
      {
        nombre: "s5_main_competitive_weakness",
        tipo: "ENUM",
        descripcion: "Sección V · Principal debilidad competitiva.",
      },

      // Sección VI — Condiciones financieras
      {
        nombre: "s6_financing_access_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VI · Acceso al financiamiento.",
      },
      {
        nombre: "s6_business_liquidity_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VI · Liquidez empresarial.",
      },
      {
        nombre: "s6_fx_availability_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VI · Disponibilidad de divisas.",
      },
      {
        nombre: "s6_fx_shortage_impact",
        tipo: "ENUM",
        descripcion:
          "Sección VI · Impacto de la escasez de divisas (Mucho/Moderadamente/Poco/Nada).",
      },
      {
        nombre: "s6_main_financing_source",
        tipo: "ENUM",
        descripcion: "Sección VI · Principal fuente de financiamiento.",
      },
      {
        nombre: "s6_instr_trade_agreements",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Usa acuerdos comerciales internacionales (1/0).",
      },
      {
        nombre: "s6_instr_sgp",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Usa Sistema Generalizado de Preferencias (1/0).",
      },
      {
        nombre: "s6_instr_tariff_refund",
        tipo: "TINYINT(1)",
        descripcion: "Sección VI · Usa Régimen de Reintegro Arancelario (1/0).",
      },
      {
        nombre: "s6_instr_trading_companies",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Usa comercializadoras internacionales (1/0).",
      },
      {
        nombre: "s6_instr_regional_regulations",
        tipo: "TINYINT(1)",
        descripcion: "Sección VI · Usa regulaciones regionales (1/0).",
      },
      {
        nombre: "s6_instr_none",
        tipo: "TINYINT(1)",
        descripcion: "Sección VI · No usa ningún instrumento (1/0).",
      },
      {
        nombre: "s6_reg_exchange_controls",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: control de cambios (1/0).",
      },
      {
        nombre: "s6_reg_export_restrictions",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: restricciones a exportaciones (1/0).",
      },
      {
        nombre: "s6_reg_non_tariff_measures",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: medidas no arancelarias (1/0).",
      },
      {
        nombre: "s6_reg_export_taxes",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: impuestos a la exportación (1/0).",
      },
      {
        nombre: "s6_reg_regulatory_uncertainty",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: incertidumbre regulatoria (1/0).",
      },
      {
        nombre: "s6_reg_complex_customs",
        tipo: "TINYINT(1)",
        descripcion:
          "Sección VI · Regulación restrictiva: procedimientos aduaneros complejos (1/0).",
      },

      // Sección VII — Entorno institucional
      {
        nombre: "s7_legal_certainty_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VII · Seguridad jurídica.",
      },
      {
        nombre: "s7_regulatory_stability_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VII · Estabilidad regulatoria.",
      },
      {
        nombre: "s7_institutional_transparency_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VII · Transparencia institucional.",
      },
      {
        nombre: "s7_policy_predictability_score",
        tipo: "TINYINT (1-5)",
        descripcion:
          "Sección VII · Predictibilidad de políticas de comercio exterior.",
      },
      {
        nombre: "s7_highest_impact_measure",
        tipo: "ENUM",
        descripcion:
          "Sección VII · Medida con mayor impacto en la competitividad.",
      },

      // Sección VIII — Inversión y perspectiva futura
      {
        nombre: "s8_invested_last_12m",
        tipo: "ENUM (Sí/No)",
        descripcion:
          "Sección VIII · ¿Realizó inversiones en los últimos 12 meses?",
      },
      {
        nombre: "s8_will_invest_next_12m",
        tipo: "ENUM (Sí/No)",
        descripcion:
          "Sección VIII · ¿Realizará inversiones en los próximos 12 meses?",
      },
      {
        nombre: "s8_reason_to_invest",
        tipo: "VARCHAR(255)",
        descripcion: "Sección VIII · Razón principal para invertir.",
      },
      {
        nombre: "s8_reason_not_to_invest",
        tipo: "VARCHAR(255)",
        descripcion: "Sección VIII · Razón principal para no invertir.",
      },
      {
        nombre: "s8_macro_stability_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Estabilidad macroeconómica.",
      },
      {
        nombre: "s8_fx_access_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Acceso a divisas.",
      },
      {
        nombre: "s8_financing_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Financiamiento.",
      },
      {
        nombre: "s8_legal_certainty_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Seguridad jurídica.",
      },
      {
        nombre: "s8_simpler_procedures_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Simplificación de trámites.",
      },
      {
        nombre: "s8_new_trade_agreements_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Nuevos acuerdos comerciales.",
      },
      {
        nombre: "s8_logistics_improvement_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Mejora logística.",
      },
      {
        nombre: "s8_new_markets_score",
        tipo: "TINYINT (1-5)",
        descripcion: "Sección VIII · Apertura de nuevos mercados.",
      },

      // Estado
      {
        nombre: "status",
        tipo: "TINYINT",
        descripcion: "1 = activo, 0 = inactivo/eliminado.",
      },
    ],
  },
  INDICES_SPE: {
    titulo: "Índices SPE — IEE, ICE, IIE, ICIE",
    descripcion:
      "Tabla spe_index_score. Calcula los 4 índices por empresa encuestada.",
    variables: [
      {
        nombre: "spe_survey_response_id",
        tipo: "INT (PK)",
        descripcion: "ID de la respuesta SPE a la que pertenece el cálculo.",
      },
      {
        nombre: "iee",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice de Expectativas Empresariales Exportadoras.",
      },
      {
        nombre: "ice",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice de Competitividad Exportadora.",
      },
      {
        nombre: "iie",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice de Internacionalización Empresarial.",
      },
      {
        nombre: "icie",
        tipo: "DECIMAL(5,2)",
        descripcion: "Índice de Clima para la Inversión Exportadora.",
      },
      {
        nombre: "calculated_at",
        tipo: "TIMESTAMP",
        descripcion: "Fecha y hora del cálculo de los índices.",
      },
    ],
  },
};

// ==========================================================================
// COMPONENTE
// ==========================================================================
export default function DiccionarioPage() {
  const [datasetActivo, setDatasetActivo] = useState("ICA");
  const [busqueda, setBusqueda] = useState("");

  const dataset = DATASETS[datasetActivo];
  const variablesFiltradas = dataset.variables.filter(
    (v) =>
      v.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.descripcion.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-brand-soft p-3 text-brand">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Observatorio de Bienestar Financiero
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              Diccionario de variables
            </h1>
            <p className="mt-1 text-sm text-muted">
              Consulta el significado de cada columna de los datasets del
              observatorio.
            </p>
          </div>
        </div>

        <nav className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1.5 shadow-sm">
          {Object.entries(DATASETS).map(([clave, valor]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setDatasetActivo(clave)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                datasetActivo === clave
                  ? "bg-maroon text-white shadow-sm"
                  : "text-ink-2 hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {valor.titulo.split(" — ")[0]}
            </button>
          ))}
        </nav>

        <div className="mb-4 rounded-xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold text-ink">{dataset.titulo}</h2>
          <p className="mt-1 text-xs text-muted">{dataset.descripcion}</p>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Buscar variable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-line bg-card py-2.5 pl-9 pr-4 text-sm text-ink-2 outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-subtle text-[9px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Variable</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {variablesFiltradas.map((variable) => (
                  <tr
                    key={variable.nombre}
                    className="border-t border-line hover:bg-brand-soft"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-brand">
                      {variable.nombre}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {variable.tipo}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {variable.descripcion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3 text-[10px] text-muted">
            Mostrando {variablesFiltradas.length} de {dataset.variables.length}{" "}
            variables
          </div>
        </div>
      </div>
    </main>
  );
}
