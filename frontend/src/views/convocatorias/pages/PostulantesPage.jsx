import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../../shared/AuthContext";
import ConfirmDialog from "../../../shared/ConfirmDialog";

// Estados (deben coincidir con el backend)
const STATUS = {
  PENDIENTE: 1,
  APROBADO: 2,
  RECHAZADO: 3,
};

const STATUS_CONFIG = {
  [STATUS.PENDIENTE]: {
    label: "Pendiente",
    badge:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
    dot: "bg-amber-700",
  },
  [STATUS.APROBADO]: {
    label: "Aceptado",
    badge:
      "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-700",
  },
  [STATUS.RECHAZADO]: {
    label: "Rechazado",
    badge: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
    dot: "bg-red-700",
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: String(STATUS.PENDIENTE), label: "Pendientes" },
  { value: String(STATUS.APROBADO), label: "Aceptados" },
  { value: String(STATUS.RECHAZADO), label: "Rechazados" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "oldest", label: "Más antiguos" },
  { value: "name", label: "Nombre (A-Z)" },
];

// Configuración visual del popup de feedback. `duration` = cierre automático (ms).
const FEEDBACK_CONFIG = {
  error: {
    Icon: AlertCircle,
    iconClass: "text-red-500",
    circleClass: "bg-red-50 dark:bg-red-950/40",
    title: "No se pudo actualizar",
    duration: 5000,
  },
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600",
    circleClass: "bg-emerald-50 dark:bg-emerald-950/40",
    title: "Postulante actualizado",
    duration: 3000,
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-amber-500",
    circleClass: "bg-amber-50 dark:bg-amber-950/40",
    title: "Atención",
    duration: 5000,
  },
};

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const normalize = (value) =>
  (value ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <span className="inline-flex items-center rounded-md bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/60">
        Desconocido
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.badge}`}
    >
      {config.label}
    </span>
  );
}

function KpiCard({ label, value, status }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-card px-6 py-5 shadow-xs">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <div>
        <p className="text-[11px] font-medium text-ink/60">{label}</p>
        <p className="text-2xl font-semibold leading-tight text-ink">{value}</p>
      </div>
    </div>
  );
}

function PillSelect({ prefix, value, onChange, options, ariaLabel }) {
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-card py-2 pl-4 pr-9 text-[11px] text-ink/60 shadow-xs">
      {prefix}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="cursor-pointer appearance-none bg-transparent font-semibold text-ink outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-ink/50" />
    </label>
  );
}

function DetailField({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">
        {label}
      </p>
      <div className="mt-1 break-words text-xs text-ink">{children}</div>
    </div>
  );
}

/**
 * Popup de feedback (éxito / error / advertencia).
 * Se cierra con el botón, con Escape, al hacer clic fuera y automáticamente
 * (3 s éxito, 5 s error/advertencia).
 */
function FeedbackModal({ feedback, onClose }) {
  const config = FEEDBACK_CONFIG[feedback.type] ?? FEEDBACK_CONFIG.error;
  const { Icon } = config;
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(onClose, config.duration);
    return () => clearTimeout(timer);
  }, [config.duration, onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      aria-describedby="feedback-modal-message"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-night/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-card p-6 text-center shadow-xl">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${config.circleClass}`}
        >
          <Icon className={`h-9 w-9 ${config.iconClass}`} />
        </div>
        <h2
          id="feedback-modal-title"
          className="mt-4 text-lg font-semibold text-ink"
        >
          {feedback.title || config.title}
        </h2>
        <p id="feedback-modal-message" className="mt-2 text-sm text-ink/70">
          {feedback.message}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function PostulanteModal({ postulante, onClose, onChangeStatus }) {
  const isPending = postulante.status === STATUS.PENDIENTE;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="postulante-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-ink/10 bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
              Convocatorias
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2
                id="postulante-modal-title"
                className="text-xl font-semibold text-ink"
              >
                Detalle del postulante
              </h2>
              <StatusBadge status={postulante.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-ink/50 transition hover:bg-surface hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-lg font-bold text-ink">
            {postulante.nombreCompleto || "Sin nombre"}
          </p>
          <div className="mt-5 border-t border-ink/10 pt-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailField label="Correo electrónico">
                {postulante.correo || "—"}
              </DetailField>
              <DetailField label="Teléfono">
                {postulante.telefono || "No especificado"}
              </DetailField>
              <DetailField label="Fecha de solicitud">
                {formatDate(postulante.fechaSolicitud)}
              </DetailField>
              <DetailField label="Estado">
                <StatusBadge status={postulante.status} />
              </DetailField>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink/15 bg-card px-4 py-1.5 text-[11px] font-medium text-ink transition hover:bg-surface"
          >
            Cerrar
          </button>
          {isPending && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeStatus(postulante, STATUS.RECHAZADO)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-card px-4 py-1.5 text-[11px] font-medium text-red-700 dark:text-red-300 transition hover:bg-red-50"
              >
                <X className="h-3 w-3" />
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => onChangeStatus(postulante, STATUS.APROBADO)}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 bg-card px-4 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50"
              >
                <Check className="h-3 w-3" />
                Aceptar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostulantesPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [convocatoria, setConvocatoria] = useState(null);
  const [stats, setStats] = useState({
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    total: 0,
  });
  const [postulantes, setPostulantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selected, setSelected] = useState(null);
  // Aceptar crea una cuenta y manda un correo: siempre se confirma antes.
  const [confirmar, setConfirmar] = useState(null);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const loadPostulantes = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/convocatorias/${id}/postulaciones`, {
          headers: authHeaders,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || "No se pudo cargar el listado de postulantes.",
          );
        }
        setConvocatoria(data.convocatoria ?? null);
        setStats(
          data.stats ?? {
            pendientes: 0,
            aprobados: 0,
            rechazados: 0,
            total: 0,
          },
        );
        setPostulantes(Array.isArray(data.postulantes) ? data.postulantes : []);
      } catch (err) {
        setError(err.message || "Ocurrió un error al cargar los postulantes.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, authHeaders],
  );

  useEffect(() => {
    loadPostulantes();
  }, [loadPostulantes]);

  const closeModal = useCallback(() => setSelected(null), []);
  const closeFeedback = useCallback(() => setFeedback(null), []);

  const handleChangeStatus = async (postulante, newStatus) => {
    setActionId(postulante.id);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/convocatorias/postulaciones/${postulante.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Solo se usa el mensaje del backend; el código HTTP nunca se muestra.
        throw new Error(data?.error || "No se pudo actualizar el postulante.");
      }
      setFeedback({
        type: "success",
        message:
          data?.message ||
          (newStatus === STATUS.APROBADO
            ? "Postulante aceptado correctamente."
            : "Postulante rechazado correctamente."),
      });
      await loadPostulantes({ silent: true });
    } catch (err) {
      // Error de red (fetch lanza TypeError): mensaje amigable en vez del técnico.
      const message =
        err instanceof TypeError
          ? "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."
          : err.message || "Ocurrió un error al actualizar el postulante.";
      setFeedback({ type: "error", message });
      // Refresca la lista para que refleje el estado real del postulante.
      loadPostulantes({ silent: true });
    } finally {
      setActionId(null);
    }
  };

  const pedirConfirmacion = (postulante, newStatus) => {
    setSelected(null);
    setConfirmar({ postulante, status: newStatus });
  };

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    const list = postulantes.filter((p) => {
      const matchesStatus =
        statusFilter === "all" || String(p.status) === statusFilter;
      const matchesSearch =
        !term ||
        normalize(p.nombreCompleto).includes(term) ||
        normalize(p.correo).includes(term);
      return matchesStatus && matchesSearch;
    });

    const time = (p) => new Date(p.fechaSolicitud).getTime() || 0;
    return [...list].sort((a, b) => {
      if (sortBy === "oldest") return time(a) - time(b);
      if (sortBy === "name") {
        return (a.nombreCompleto ?? "").localeCompare(
          b.nombreCompleto ?? "",
          "es",
        );
      }
      return time(b) - time(a);
    });
  }, [postulantes, search, statusFilter, sortBy]);

  const total = stats.total ?? postulantes.length;

  return (
    <div className="min-h-full bg-surface px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
            Convocatorias
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">
            Listado de postulantes
          </h1>
          <p className="mt-1.5 text-xs text-ink/60">
            Revisa las postulaciones. Al aceptar a alguien se le crea su cuenta
            de encuestador en la sede de la convocatoria.
          </p>
        </div>

        {convocatoria && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-card px-6 py-5 shadow-xs">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-ink/50">
                Convocatoria seleccionada
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {convocatoria.titulo || "Sin título"}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink/50">
                ID #{convocatoria.id}
              </p>
            </div>
            <Link
              to="/convocatorias"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-card px-4 py-1.5 text-[11px] font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              Cambiar convocatoria
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-[11px] font-medium text-ink/60">
            {total}{" "}
            {total === 1 ? "postulante registrado" : "postulantes registrados"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Pendientes"
              value={stats.pendientes ?? 0}
              status={STATUS.PENDIENTE}
            />
            <KpiCard
              label="Aceptados"
              value={stats.aprobados ?? 0}
              status={STATUS.APROBADO}
            />
            <KpiCard
              label="Rechazados"
              value={stats.rechazados ?? 0}
              status={STATUS.RECHAZADO}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full rounded-full border border-ink/10 bg-card py-2 pl-10 pr-4 text-[11px] text-ink shadow-xs outline-none transition placeholder:text-ink/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <PillSelect
              prefix="Estado:"
              ariaLabel="Filtrar por estado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={FILTER_OPTIONS}
            />
            <PillSelect
              prefix="Ordenar por:"
              ariaLabel="Ordenar postulantes"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-xs">
          <div className="border-b border-ink/10 px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">
              Postulantes registrados
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink/60">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              Cargando postulantes...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="max-w-sm text-xs text-ink/70">{error}</p>
              <button
                type="button"
                onClick={() => loadPostulantes()}
                className="rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Reintentar
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="h-6 w-6 text-ink/30" />
              <p className="text-xs font-medium text-ink/70">
                {postulantes.length === 0
                  ? "Aún no hay postulantes para esta convocatoria."
                  : "No se encontraron postulantes con esos filtros."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-ink/10 bg-surface/60 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
                    <th className="px-6 py-2.5">Postulante</th>
                    <th className="px-4 py-2.5">Correo electrónico</th>
                    <th className="px-4 py-2.5">Fecha de solicitud</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-6 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {visible.map((p) => {
                    const isPending = p.status === STATUS.PENDIENTE;
                    const isBusy = actionId === p.id;
                    return (
                      <tr key={p.id} className="transition hover:bg-surface/50">
                        <td className="px-6 py-3.5">
                          <button
                            type="button"
                            onClick={() => setSelected(p)}
                            className="text-left text-xs font-semibold text-ink transition hover:text-brand hover:underline"
                          >
                            {p.nombreCompleto || "Sin nombre"}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink/60">
                          {p.correo || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink/60">
                          {formatDate(p.fechaSolicitud)}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    pedirConfirmacion(p, STATUS.APROBADO)
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-700 bg-card px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isBusy && (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  )}
                                  Aceptar
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    pedirConfirmacion(p, STATUS.RECHAZADO)
                                  }
                                  className="rounded-md border border-red-700 bg-card px-3 py-1 text-[11px] font-medium text-red-700 dark:text-red-300 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelected(p)}
                                className="text-[11px] font-bold text-brand transition hover:underline"
                              >
                                Ver detalle
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <PostulanteModal
          postulante={selected}
          onClose={closeModal}
          onChangeStatus={pedirConfirmacion}
        />
      )}
      <ConfirmDialog
        open={Boolean(confirmar)}
        titulo={
          confirmar?.status === STATUS.APROBADO
            ? "Aceptar postulante"
            : "Rechazar postulante"
        }
        mensaje={
          confirmar?.status === STATUS.APROBADO
            ? `Se creará la cuenta de encuestador de ${confirmar.postulante.nombreCompleto} y se le enviará su contraseña temporal por correo.`
            : `${confirmar?.postulante.nombreCompleto ?? "El postulante"} quedará rechazado.`
        }
        textoConfirmar={
          confirmar?.status === STATUS.APROBADO ? "Aceptar" : "Rechazar"
        }
        onCancel={() => setConfirmar(null)}
        onConfirm={() => {
          const { postulante, status } = confirmar;
          setConfirmar(null);
          handleChangeStatus(postulante, status);
        }}
      />
      {feedback && (
        <FeedbackModal feedback={feedback} onClose={closeFeedback} />
      )}
    </div>
  );
}
