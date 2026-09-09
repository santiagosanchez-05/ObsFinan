import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Users,
  Briefcase,
  ShieldCheck,
  Database,
  Filter,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../../shared/AuthContext";

/* ------------------------------------------------------------------ */
/*  Configuración API                                                  */
/* ------------------------------------------------------------------ */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

/* ------------------------------------------------------------------ */
/*  Design tokens (mantener diseño original)                          */
/* ------------------------------------------------------------------ */

const COLORS = {
  bg: "#f5f7f9",
  white: "#ffffff",
  primary: "#9e0044",
  primarySoft: "#fef2f2",
  secondary: "#c2427a",
  text: "#1a1a1a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  border: "#e5e7eb",
  borderSoft: "#f3f4f6",
  success: "#16a34a",
  successBg: "#f0fdf4",
  info: "#2563eb",
  infoBg: "#eff6ff",
  neutralBg: "#f9fafb",
  neutralText: "#9ca3af",
};

const FONT = "'Sora', system-ui, -apple-system, sans-serif";

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */

const formatNumber = (n) => Number(n || 0).toLocaleString("es-BO");

/* ------------------------------------------------------------------ */
/*  Filtro de sedes                                                    */
/* ------------------------------------------------------------------ */

function FilterTabs({ sedes, selected, onSelect }) {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        padding: 6,
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onSelect("todas")}
        style={{
          fontFamily: FONT,
          fontWeight: selected === "todas" ? 700 : 400,
          fontSize: 14,
          color: selected === "todas" ? COLORS.white : COLORS.textMuted,
          background: selected === "todas" ? COLORS.primary : "transparent",
          border: "none",
          borderRadius: 8,
          padding: "10px 24px",
          cursor: "pointer",
          boxShadow:
            selected === "todas"
              ? "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)"
              : "none",
          transition: "background 0.15s ease",
        }}
      >
        Todas
      </button>

      {sedes.map((sede) => {
        const active = String(sede.id) === String(selected);

        return (
          <button
            key={sede.id}
            onClick={() => onSelect(String(sede.id))}
            style={{
              fontFamily: FONT,
              fontWeight: active ? 700 : 400,
              fontSize: 14,
              color: active ? COLORS.white : COLORS.textMuted,
              background: active ? COLORS.primary : "transparent",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              cursor: "pointer",
              boxShadow: active
                ? "0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -2px rgba(0,0,0,0.1)"
                : "none",
              transition: "background 0.15s ease",
            }}
          >
            {sede.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI                                                                 */
/* ------------------------------------------------------------------ */

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  badge,
  badgeTone = "success",
}) {
  const badgeStyles = {
    success: {
      bg: COLORS.successBg,
      text: COLORS.success,
    },
    info: {
      bg: COLORS.infoBg,
      text: COLORS.info,
    },
    neutral: {
      bg: COLORS.neutralBg,
      text: COLORS.neutralText,
    },
  }[badgeTone];

  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 12,
        padding: 24,
        flex: "1 0 0",
        minWidth: 0,
        boxShadow: "0px 1px 1px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            background: COLORS.primarySoft,
            borderRadius: 8,
            padding: 12,
            display: "flex",
          }}
        >
          <Icon size={20} color={COLORS.primary} strokeWidth={2} />
        </div>

        {(delta || badge) && (
          <span
            style={{
              background: badgeStyles.bg,
              color: badgeStyles.text,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 9999,
              padding: "4px 8px",
            }}
          >
            {delta || badge}
          </span>
        )}
      </div>

      <div
        style={{
          fontFamily: FONT,
          fontSize: 14,
          color: COLORS.textMuted,
          paddingTop: 12,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 24,
          color: COLORS.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tarjeta de gráfica                                                 */
/* ------------------------------------------------------------------ */

function ChartCard({ title, subtitle, children }) {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 12,
        padding: 32,
        flex: "1 0 0",
        minWidth: 0,
        boxShadow: "0px 1px 1px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 18,
            color: COLORS.text,
            margin: 0,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontFamily: FONT,
            fontSize: 14,
            color: COLORS.textMuted,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      <div
        style={{
          width: "100%",
          height: 300,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabla                                                              */
/* ------------------------------------------------------------------ */

function TableShell({ title, subtitle, action, children, footer }) {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 12,
        boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 20,
              color: COLORS.text,
              margin: 0,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              fontFamily: FONT,
              fontSize: 14,
              color: COLORS.textMuted,
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        </div>

        {action}
      </div>

      {children}

      {footer}
    </div>
  );
}

const thStyle = {
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: COLORS.textMuted,
  textAlign: "left",
  padding: "16px 24px",
};

const tdStyle = {
  fontFamily: FONT,
  fontSize: 14,
  color: COLORS.text,
  padding: "22px 24px",
  borderTop: `1px solid ${COLORS.borderSoft}`,
};

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */

function Avatar({ name }) {
  const safeName = name || "Admin";

  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(158,0,68,0.1)",
        color: COLORS.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estado de carga                                                    */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 12,
        padding: 40,
        textAlign: "center",
        fontFamily: FONT,
        color: COLORS.textMuted,
        fontSize: 14,
      }}
    >
      Cargando datos de las sedes...
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Estado de error                                                     */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }) {
  return (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 12,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 16,
          color: COLORS.text,
          marginBottom: 8,
        }}
      >
        No se pudieron cargar los datos
      </div>

      <div
        style={{
          fontFamily: FONT,
          fontSize: 14,
          color: COLORS.textMuted,
          marginBottom: 20,
        }}
      >
        {message}
      </div>

      <button
        onClick={onRetry}
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.white,
          background: COLORS.primary,
          border: "none",
          borderRadius: 8,
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vista: Sede específica                                             */
/* ------------------------------------------------------------------ */

function SedeDetailView({ data, sedeLabel }) {
  if (!data) {
    return (
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.borderSoft}`,
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          fontFamily: FONT,
          color: COLORS.textMuted,
        }}
      >
        No hay información disponible para esta sede.
      </div>
    );
  }

  const kpis = data.kpis || {};

  const registrosPorMes = Array.isArray(data.registrosPorMes)
    ? data.registrosPorMes
    : [];

  const admins = Array.isArray(data.admins) ? data.admins : [];

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 24,
          width: "100%",
        }}
      >
        <KpiCard
          icon={Users}
          label="Usuarios en esta sede"
          value={formatNumber(kpis.usuarios?.value || 0)}
          delta={kpis.usuarios?.delta}
          badgeTone="success"
        />

        <KpiCard
          icon={Briefcase}
          label="Clientes"
          value={formatNumber(kpis.clientes?.value || 0)}
          delta={kpis.clientes?.delta}
          badgeTone="success"
        />

        <KpiCard
          icon={ShieldCheck}
          label="Admins"
          value={formatNumber(kpis.admins?.value || 0)}
        />

        <KpiCard
          icon={Database}
          label="Registros cargados"
          value={formatNumber(kpis.registros?.value || 0)}
          badge="Actualizado"
          badgeTone="info"
        />
      </div>

      <ChartCard
        title="Registros cargados en el tiempo"
        subtitle="Últimos 6 meses"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={registrosPorMes}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="registrosFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={COLORS.primary}
                  stopOpacity={0.15}
                />

                <stop
                  offset="100%"
                  stopColor={COLORS.primary}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke={COLORS.borderSoft} />

            <XAxis
              dataKey="mes"
              tick={{
                fontFamily: FONT,
                fontSize: 12,
                fill: COLORS.textMuted,
              }}
              axisLine={{
                stroke: COLORS.borderSoft,
              }}
              tickLine={false}
            />

            <YAxis
              tickFormatter={(v) => `${Number(v) / 1000}k`}
              tick={{
                fontFamily: FONT,
                fontSize: 12,
                fill: COLORS.textMuted,
              }}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            <Tooltip
              formatter={(v) => formatNumber(v)}
              labelStyle={{
                fontFamily: FONT,
              }}
              contentStyle={{
                fontFamily: FONT,
                borderRadius: 8,
                border: `1px solid ${COLORS.borderSoft}`,
              }}
            />

            <Area
              type="monotone"
              dataKey="registros"
              stroke={COLORS.primary}
              strokeWidth={2}
              fill="url(#registrosFill)"
              dot={{
                r: 4,
                fill: COLORS.primary,
                strokeWidth: 0,
              }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <TableShell
        title="Admins de esta sede"
        subtitle={`Gestionando operaciones en ${sedeLabel}`}
        action={
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: FONT,
              fontSize: 14,
              color: COLORS.textMuted,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Filter size={14} />
            Filtrar
          </button>
        }
        footer={
          <div
            style={{
              background: COLORS.neutralBg,
              borderTop: `1px solid ${COLORS.borderSoft}`,
              display: "flex",
              justifyContent: "center",
              padding: "16px 24px",
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 14,
                color: COLORS.primary,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ver todos los administradores
              <ArrowRight size={14} />
            </button>
          </div>
        }
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              background: COLORS.neutralBg,
            }}
          >
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Correo</th>

              <th
                style={{
                  ...thStyle,
                  textAlign: "center",
                }}
              >
                Datasets subidos
              </th>

              <th style={thStyle}>Registros totales</th>

              <th style={thStyle}>Última actividad</th>
            </tr>
          </thead>

          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: COLORS.textMuted,
                  }}
                >
                  No hay administradores activos en esta sede.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id}>
                  <td
                    style={{
                      ...tdStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar name={admin.nombre} />

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {admin.nombre}
                    </span>
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      color: COLORS.textMuted,
                    }}
                  >
                    {admin.correo}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                    }}
                  >
                    {formatNumber(admin.datasets)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                    }}
                  >
                    {formatNumber(admin.registros)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      color: COLORS.textMuted,
                    }}
                  >
                    {admin.actividad || "Sin actividad"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Vista: Todas                                                       */
/* ------------------------------------------------------------------ */

function TodasView({ summary, globalKpis, onSelectSede }) {
  const resumen = Array.isArray(summary) ? summary : [];

  const barData = useMemo(
    () =>
      resumen.map((sede) => ({
        sede: sede.sede,
        usuarios: Number(sede.usuarios || 0),
        registros: Number(sede.registros || 0),
      })),
    [resumen],
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 24,
          width: "100%",
        }}
      >
        <KpiCard
          icon={Users}
          label="Total de usuarios"
          value={formatNumber(globalKpis?.usuarios?.value || 0)}
          delta={globalKpis?.usuarios?.delta}
          badgeTone="success"
        />

        <KpiCard
          icon={Briefcase}
          label="Total de clientes"
          value={formatNumber(globalKpis?.clientes?.value || 0)}
          delta={globalKpis?.clientes?.delta}
          badgeTone="success"
        />

        <KpiCard
          icon={ShieldCheck}
          label="Total de admins"
          value={formatNumber(globalKpis?.admins?.value || 0)}
          badge="Global"
          badgeTone="neutral"
        />

        <KpiCard
          icon={Database}
          label="Total de registros"
          value={formatNumber(globalKpis?.registros?.value || 0)}
          badge="Actualizado"
          badgeTone="info"
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 32,
          width: "100%",
        }}
      >
        <ChartCard
          title="Usuarios por sede"
          subtitle="Distribución de estudiantes y personal"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} stroke={COLORS.borderSoft} />

              <XAxis
                dataKey="sede"
                tick={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fill: COLORS.textMuted,
                }}
                axisLine={{
                  stroke: COLORS.borderSoft,
                }}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fill: COLORS.textMuted,
                }}
                axisLine={false}
                tickLine={false}
                width={40}
              />

              <Tooltip
                formatter={(v) => formatNumber(v)}
                contentStyle={{
                  fontFamily: FONT,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.borderSoft}`,
                }}
              />

              <Bar
                dataKey="usuarios"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Registros cargados por sede"
          subtitle="Volumen de datos operacionales"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} stroke={COLORS.borderSoft} />

              <XAxis
                dataKey="sede"
                tick={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fill: COLORS.textMuted,
                }}
                axisLine={{
                  stroke: COLORS.borderSoft,
                }}
                tickLine={false}
              />

              <YAxis
                tickFormatter={(v) => `${Number(v) / 1000}k`}
                tick={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fill: COLORS.textMuted,
                }}
                axisLine={false}
                tickLine={false}
                width={40}
              />

              <Tooltip
                formatter={(v) => formatNumber(v)}
                contentStyle={{
                  fontFamily: FONT,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.borderSoft}`,
                }}
              />

              <Bar
                dataKey="registros"
                fill={COLORS.secondary}
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <TableShell
        title="Resumen por sede"
        subtitle="Métricas operativas consolidadas"
        action={
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: FONT,
              fontSize: 14,
              color: COLORS.textMuted,
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            Exportar Reporte
          </button>
        }
        footer={
          <div
            style={{
              background: COLORS.neutralBg,
              borderTop: `1px solid ${COLORS.borderSoft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 12,
                color: COLORS.textMuted,
              }}
            >
              Mostrando {resumen.length} de {resumen.length} sedes activas
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <button disabled style={pagerBtnStyle(false)}>
                <ChevronLeft size={14} />
              </button>

              <button disabled style={pagerBtnStyle(true)}>
                1
              </button>

              <button disabled style={pagerBtnStyle(false)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        }
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              background: COLORS.neutralBg,
            }}
          >
            <tr>
              <th style={thStyle}>Sede</th>
              <th style={thStyle}>Usuarios</th>
              <th style={thStyle}>Clientes</th>
              <th style={thStyle}>Admins</th>
              <th style={thStyle}>Registros Cargados</th>
              <th style={thStyle}>Última Actividad</th>
            </tr>
          </thead>

          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: COLORS.textMuted,
                  }}
                >
                  No hay sedes activas registradas.
                </td>
              </tr>
            ) : (
              resumen.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelectSede(String(row.id))}
                  style={{
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = COLORS.neutralBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      ...tdStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(158,0,68,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={14} color={COLORS.primary} />
                    </div>

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {row.sede}
                    </span>
                  </td>

                  <td style={tdStyle}>{formatNumber(row.usuarios)}</td>

                  <td style={tdStyle}>{formatNumber(row.clientes)}</td>

                  <td style={tdStyle}>{formatNumber(row.admins)}</td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                    }}
                  >
                    {formatNumber(row.registros)}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      color: COLORS.textMuted,
                    }}
                  >
                    {row.actividad || "Sin actividad"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Botones de paginación                                              */
/* ------------------------------------------------------------------ */

function pagerBtnStyle(active) {
  return {
    width: 32,
    height: 32,
    borderRadius: 4,
    border: active ? "none" : `1px solid ${COLORS.border}`,
    background: active ? COLORS.primary : COLORS.white,
    color: active ? COLORS.white : COLORS.text,
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: active ? "default" : "not-allowed",
  };
}

/* ------------------------------------------------------------------ */
/*  Página principal                                                   */
/* ------------------------------------------------------------------ */

export default function SedesPage() {
  const { token } = useAuth();

  const [selectedSede, setSelectedSede] = useState("todas");

  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  /* ---------------------------------------------------------------- */
  /*  Obtener estadísticas reales                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function cargarEstadisticas() {
      if (!token) {
        if (!mounted) return;

        setDashboard(null);
        setLoading(false);
        setError("No existe una sesión autenticada.");

        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/api/sedes/stats`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudieron obtener las estadísticas de las sedes.",
          );
        }

        if (!mounted) return;

        setDashboard(data);
      } catch (err) {
        if (!mounted) return;

        setDashboard(null);

        setError(err.message || "Ocurrió un error al cargar las estadísticas.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    cargarEstadisticas();

    return () => {
      mounted = false;
    };
  }, [token, reloadKey]);

  /* ---------------------------------------------------------------- */
  /*  Validar sede seleccionada                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!dashboard) return;

    const sedes = Array.isArray(dashboard.sedes) ? dashboard.sedes : [];

    const ids = new Set(sedes.map((sede) => String(sede.id)));

    if (selectedSede !== "todas" && !ids.has(String(selectedSede))) {
      setSelectedSede("todas");
    }
  }, [dashboard, selectedSede]);

  /* ---------------------------------------------------------------- */
  /*  Datos provenientes del backend                                  */
  /* ---------------------------------------------------------------- */

  const sedes = Array.isArray(dashboard?.sedes) ? dashboard.sedes : [];

  const sedeSeleccionada = sedes.find(
    (sede) => String(sede.id) === String(selectedSede),
  );

  const sedeLabel = sedeSeleccionada?.label || "";

  const isTodas = selectedSede === "todas";

  const detalle = dashboard?.detalle || {};

  const datosSede = !isTodas ? detalle[String(selectedSede)] : null;

  /* ---------------------------------------------------------------- */
  /*  Si hay datos y existe Cochabamba, iniciamos en Cochabamba       */
  /*  Si no, dejamos "Todas".                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!dashboard || sedes.length === 0) {
      return;
    }

    if (
      selectedSede === "todas" &&
      sedes.some((sede) => String(sede.label).toLowerCase() === "cochabamba")
    ) {
      setSelectedSede(
        String(
          sedes.find(
            (sede) => String(sede.label).toLowerCase() === "cochabamba",
          ).id,
        ),
      );
    }
  }, [dashboard]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          maxWidth: 1440,
          width: "100%",
          margin: "0 auto",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 30,
              color: COLORS.text,
              margin: 0,
            }}
          >
            Sedes
          </h1>

          <p
            style={{
              fontFamily: FONT,
              fontSize: 16,
              color: COLORS.textMuted,
              margin: 0,
            }}
          >
            {isTodas
              ? "Actividad y desempeño global"
              : "Actividad y desempeño por sede"}
          </p>
        </div>

        {!loading && !error && dashboard && (
          <FilterTabs
            sedes={sedes}
            selected={selectedSede}
            onSelect={setSelectedSede}
          />
        )}

        {loading && <LoadingState />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        )}

        {!loading &&
          !error &&
          dashboard &&
          (isTodas ? (
            <TodasView
              summary={dashboard.resumen}
              globalKpis={dashboard.global}
              onSelectSede={setSelectedSede}
            />
          ) : (
            <SedeDetailView data={datosSede} sedeLabel={sedeLabel} />
          ))}
      </main>
    </div>
  );
}
