import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3 } from "lucide-react";

const COLORS = {
  white: "#ffffff",
  primary: "#9e0044",
  primarySoft: "#fef2f2",
  text: "#1a1a1a",
  textMuted: "#64748b",
  border: "#e5e7eb",
};

const FONT = "'Sora', system-ui, -apple-system, sans-serif";

export default function SessionExpiredModal({ open, onFinish }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onFinish();
      navigate("/login", { replace: true });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, onFinish, navigate]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-message"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.45)",
        padding: "24px",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "18px",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            margin: "0 auto 20px",
            borderRadius: "50%",
            background: COLORS.primarySoft,
            color: COLORS.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Clock3 size={27} />
        </div>

        <h2
          id="session-expired-title"
          style={{
            margin: "0 0 10px",
            color: COLORS.text,
            fontSize: "21px",
            lineHeight: 1.3,
            fontWeight: 700,
          }}
        >
          Su sesión expiró
        </h2>

        <p
          id="session-expired-message"
          style={{
            margin: 0,
            color: COLORS.textMuted,
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Será redirigido al inicio de sesión.
        </p>

        <div
          style={{
            width: "100%",
            height: "3px",
            marginTop: "24px",
            overflow: "hidden",
            borderRadius: "999px",
            background: COLORS.primarySoft,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: COLORS.primary,
              transformOrigin: "left center",
              animation: "sessionExpiredProgress 2s linear forwards",
            }}
          />
        </div>

        <style>
          {`
            @keyframes sessionExpiredProgress {
              from {
                transform: scaleX(1);
              }
              to {
                transform: scaleX(0);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}
