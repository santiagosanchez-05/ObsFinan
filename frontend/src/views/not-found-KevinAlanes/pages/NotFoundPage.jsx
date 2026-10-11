import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const COLORS = {
  // Colores del tema (index.css): cambian solos en modo oscuro.
  onPrimary: "#ffffff",
  primaryText: "var(--color-brand)", // guindo para textos e íconos (más claro en modo oscuro)
  bg: "var(--color-surface)",
  white: "var(--color-card)",
  primary: "#9e0044",
  primarySoft: "var(--color-brand-soft)",
  text: "var(--color-ink)",
  textMuted: "var(--color-muted)",
  border: "var(--color-line)",
};

const FONT = "'Sora', system-ui, -apple-system, sans-serif";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const volver = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 72px)",
        background: COLORS.bg,
        fontFamily: FONT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "20px",
          padding: "56px 40px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: COLORS.primarySoft,
            color: COLORS.primaryText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: "28px",
            fontWeight: 700,
          }}
        >
          404
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            color: COLORS.text,
            fontSize: "30px",
            lineHeight: 1.2,
            fontWeight: 700,
          }}
        >
          Página no encontrada
        </h1>

        <p
          style={{
            margin: "0 auto 32px",
            maxWidth: "460px",
            color: COLORS.textMuted,
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          La página que estás buscando no existe o ya no está disponible.
        </p>

        <button
          type="button"
          onClick={volver}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minHeight: "44px",
            padding: "0 20px",
            border: "none",
            borderRadius: "10px",
            background: COLORS.primary,
            color: COLORS.onPrimary,
            fontFamily: FONT,
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.opacity = "1";
          }}
        >
          <ArrowLeft size={17} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
