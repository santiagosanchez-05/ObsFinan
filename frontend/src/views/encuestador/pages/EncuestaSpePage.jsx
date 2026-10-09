// frontend/src/views/encuestador/pages/EncuestaSpePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { useAuth } from "../../../shared/AuthContext";
import { SPE_SECTIONS } from "../../spe/spe.questions";

const TOTAL_STEPS = SPE_SECTIONS.length; // 8
const CURRENT_YEAR = new Date().getFullYear();

/* ---------- enums del backend (deben coincidir EXACTAMENTE) ---------- */

const EXPECTATION_SINGULAR = [
  "Aumentará significativamente",
  "Aumentará moderadamente",
  "Estable",
  "Disminuirá moderadamente",
  "Disminuirá significativamente",
];

const EXPECTATION_PLURAL = [
  "Aumentarán significativamente",
  "Aumentarán moderadamente",
  "Estables",
  "Disminuirán moderadamente",
  "Disminuirán significativamente",
];

const BACKEND_ENUMS = {
  gdpExpectation: EXPECTATION_SINGULAR,
  inflationExpectation: EXPECTATION_SINGULAR,
  exchangeRateExpectation: EXPECTATION_SINGULAR,
  companyExportsExpectation: EXPECTATION_PLURAL,
};

// Solo en desarrollo: avisa si las options de spe.questions.js no coinciden con el backend.
if (import.meta.env?.DEV) {
  SPE_SECTIONS.forEach((s) =>
    s.fields.forEach((f) => {
      const expected = BACKEND_ENUMS[f.name];
      if (!expected) return;
      const actual = (f.options || []).map((o) =>
        typeof o === "object" && o !== null ? o.value : o,
      );
      const missing = expected.filter((v) => !actual.includes(v));
      const extra = actual.filter((v) => !expected.includes(v));
      if (missing.length || extra.length) {
        // eslint-disable-next-line no-console
        console.warn(
          `[EncuestaSpePage] Las opciones de "${f.name}" no coinciden con el enum del backend.`,
          { faltantes: missing, sobrantes: extra },
        );
      }
    }),
  );
}

/* ---------- helpers ---------- */

// Todos los campos son obligatorios salvo que se marquen explícitamente como opcionales.
const isRequired = (field) =>
  field.required !== false && field.optional !== true;

const normalizeOption = (opt) =>
  typeof opt === "object" && opt !== null
    ? { value: opt.value, label: opt.label ?? String(opt.value) }
    : { value: opt, label: String(opt) };

// El backend espera los strings "Sí" / "No" (con acento).
const YES_NO_OPTIONS = [
  { value: "Sí", label: "Sí" },
  { value: "No", label: "No" },
];

const isEmpty = (field, value) => {
  if (field.type === "checkbox")
    return !Array.isArray(value) || value.length === 0;
  if (field.type === "radio")
    return value === undefined || value === null || value === "";
  if (field.type === "scale" || field.type === "number") {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      Number.isNaN(Number(value))
    );
  }
  return value === undefined || value === null || String(value).trim() === "";
};

const buildInitialValues = () => {
  const init = {};
  SPE_SECTIONS.forEach((s) =>
    s.fields.forEach((f) => {
      init[f.name] = f.type === "checkbox" ? [] : "";
    }),
  );
  return init;
};

const inputBase =
  "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-maroon/30 focus:border-maroon transition";

const inputClass = (hasError) =>
  `${inputBase} ${hasError ? "border-red-500 bg-red-50/40" : "border-ink/10"}`;

/* ---------- campo individual ---------- */

function FieldRenderer({ field, value, error, onChange }) {
  const required = isRequired(field);
  const id = `field-${field.name}`;

  const renderControl = () => {
    switch (field.type) {
      case "select":
        return (
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={inputClass(!!error)}
          >
            <option value="">Seleccione una opción</option>
            {(field.options || []).map((o) => {
              const opt = normalizeOption(o);
              return (
                <option key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
          </select>
        );

      case "radio": {
        const options = field.options?.length
          ? field.options.map(normalizeOption)
          : YES_NO_OPTIONS;
        return (
          <div
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-labelledby={`${id}-label`}
          >
            {options.map((opt) => {
              const selected = value === opt.value;
              return (
                <button
                  type="button"
                  key={String(opt.value)}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(field.name, opt.value)}
                  className={`rounded-2xl border px-5 py-2.5 text-sm font-medium transition ${
                    selected
                      ? "border-maroon bg-maroon text-white shadow-xs"
                      : `bg-white text-ink hover:border-maroon/50 ${
                          error ? "border-red-500" : "border-ink/10"
                        }`
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      case "scale":
        return (
          <div>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-labelledby={`${id}-label`}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = Number(value) === n;
                return (
                  <button
                    type="button"
                    key={n}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange(field.name, n)}
                    className={`h-12 flex-1 rounded-2xl border text-sm font-semibold transition ${
                      selected
                        ? "border-maroon bg-maroon text-white shadow-xs"
                        : `bg-white text-ink hover:border-maroon/50 ${
                            error ? "border-red-500" : "border-ink/10"
                          }`
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink/50">
              <span>{field.minLabel || "Muy bajo"}</span>
              <span>{field.maxLabel || "Muy alto"}</span>
            </div>
          </div>
        );

      case "number":
        return (
          <input
            id={id}
            type="number"
            inputMode="numeric"
            value={value}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={inputClass(!!error)}
          />
        );

      case "checkbox":
        return (
          <div
            className={`grid gap-3 sm:grid-cols-2 rounded-2xl ${
              error ? "ring-1 ring-red-500 p-2" : ""
            }`}
          >
            {(field.options || []).map((o) => {
              const opt = normalizeOption(o);
              const checked = Array.isArray(value) && value.includes(opt.value);
              return (
                <label
                  key={String(opt.value)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-ink transition ${
                    checked
                      ? "border-maroon bg-maroon/5"
                      : "border-ink/10 bg-white hover:border-maroon/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = Array.isArray(value) ? value : [];
                      onChange(
                        field.name,
                        checked
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value],
                      );
                    }}
                    className="h-4 w-4 accent-[#961d4b]"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        );

      case "text":
      default:
        return (
          <input
            id={id}
            type="text"
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={inputClass(!!error)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="text-sm font-semibold text-ink"
      >
        {field.label}
        {required ? (
          <span className="ml-1 text-maroon">*</span>
        ) : (
          <span className="ml-2 text-xs font-normal text-ink/50">
            (opcional)
          </span>
        )}
      </label>
      {renderControl()}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

/* ---------- barra de progreso ---------- */

function ProgressBar({ current, onGoTo }) {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-center gap-2 sm:min-w-0 sm:justify-between">
        {SPE_SECTIONS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.id}
              className="flex flex-1 items-center gap-2 last:flex-none"
            >
              <button
                type="button"
                disabled={!done} // solo se puede volver atrás, no saltar adelante
                onClick={() => onGoTo(i)}
                aria-current={active ? "step" : undefined}
                title={s.title}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                  active
                    ? "border-maroon bg-maroon text-white shadow-xs"
                    : done
                      ? "border-maroon bg-maroon/10 text-maroon hover:bg-maroon/20"
                      : "border-ink/10 bg-white text-ink/40"
                } ${done ? "cursor-pointer" : "cursor-default"}`}
              >
                {done ? <Check className="h-4 w-4" /> : s.number}
              </button>
              {i < TOTAL_STEPS - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded ${done ? "bg-maroon" : "bg-ink/10"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- página ---------- */

export default function EncuestaSpePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const topRef = useRef(null);

  const [eventName, setEventName] = useState(location.state?.eventName || "");
  const [loadingEvent, setLoadingEvent] = useState(!location.state?.eventName);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(0);
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [semester, setSemester] = useState("");
  const [values, setValues] = useState(buildInitialValues);
  const [errors, setErrors] = useState({});

  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const section = SPE_SECTIONS[step];
  const isLast = step === TOTAL_STEPS - 1;
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  /* cargar evento (si no vino por navegación) */
  useEffect(() => {
    if (eventName) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingEvent(true);
        const res = await fetch(`/api/events/${eventId}`, {
          headers: authHeaders,
        });
        if (!res.ok) throw new Error("No se pudo cargar el evento.");
        const data = await res.json();
        const name =
          data?.name ??
          data?.title ??
          data?.event?.name ??
          data?.event?.title ??
          "";
        if (!cancelled) setEventName(name || `Evento #${eventId}`);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || "Error al cargar el evento.");
          setEventName(`Evento #${eventId}`);
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, authHeaders]);

  /* scroll al cambiar de paso */
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  /* redirección tras éxito */
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate("/encuestador/eventos"), 2500);
    return () => clearTimeout(t);
  }, [success, navigate]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  /* validación de la sección actual (+ año/semestre en el paso 1) */
  const validateStep = () => {
    const newErrors = {};

    if (step === 0) {
      const y = Number(year);
      if (!year || !Number.isInteger(y) || y < 2000 || y > 2100) {
        newErrors.year = "Ingrese un año válido.";
      }
      if (semester !== "1" && semester !== "2") {
        newErrors.semester = "Seleccione el semestre.";
      }
    }

    section.fields.forEach((f) => {
      if (isRequired(f) && isEmpty(f, values[f.name])) {
        newErrors[f.name] = "Este campo es obligatorio.";
        return;
      }
      if (f.type === "scale" && !isEmpty(f, values[f.name])) {
        const n = Number(values[f.name]);
        if (n < 1 || n > 5)
          newErrors[f.name] = "Seleccione un valor entre 1 y 5.";
      }
      if (
        f.type === "number" &&
        !isEmpty(f, values[f.name]) &&
        Number(values[f.name]) < 0
      ) {
        newErrors[f.name] = "El valor no puede ser negativo.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const goToStep = (i) => {
    if (i < step) {
      setErrors({});
      setStep(i);
    }
  };

  const buildPayload = () => {
    const payload = {
      eventId,
      year: Number(year),
      semester: Number(semester),
    };
    SPE_SECTIONS.forEach((s) =>
      s.fields.forEach((f) => {
        const v = values[f.name];
        if (isEmpty(f, v)) return; // opcionales vacíos no se envían
        // number y scale -> número; radio, select, text y checkbox se envían tal cual (strings/arrays)
        payload[f.name] =
          f.type === "number" || f.type === "scale" ? Number(v) : v;
      }),
    );
    return payload;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setSending(true);
    try {
      const res = await fetch("/api/spe/encuestas", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        let msg = "No se pudo enviar la encuesta.";
        try {
          const data = await res.json();
          msg = data?.message || data?.error || msg;
        } catch {
          /* respuesta sin JSON */
        }
        throw new Error(msg);
      }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Error de conexión. Intente nuevamente.");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSending(false);
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (isLast) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  /* ---------- render ---------- */

  if (loadingEvent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface">
        <div className="flex items-center gap-3 text-ink/70">
          <Loader2 className="h-6 w-6 animate-spin text-maroon" />
          Cargando evento…
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface px-4 py-8">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-xs">
          <CheckCircle2 className="h-14 w-14 text-maroon" />
          <h2 className="text-xl font-bold text-ink">Encuesta enviada</h2>
          <p className="text-sm text-ink/70">
            Encuesta enviada, queda pendiente de aprobación.
          </p>
          <Link
            to="/encuestador/eventos"
            className="rounded-2xl bg-maroon px-5 py-2.5 text-sm font-semibold text-white"
          >
            Volver a eventos
          </Link>
          <p className="text-xs text-ink/50">Redirigiendo automáticamente…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div
        ref={topRef}
        className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8"
      >
        {/* HEADER */}
        <header className="flex flex-col gap-1">
          <Link
            to="/encuestador/eventos"
            className="mb-2 flex w-fit items-center gap-1 text-xs font-medium text-maroon hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a eventos
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-ink">
                Registrar encuesta SPE
              </h1>
              <p className="text-sm text-ink/60">{eventName}</p>
            </div>
            <span className="rounded-full bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon">
              Paso {step + 1} de {TOTAL_STEPS}
            </span>
          </div>
        </header>

        {loadError && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4" /> {loadError} Puedes continuar con
            el registro.
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
          </div>
        )}

        {/* PROGRESO */}
        <ProgressBar current={step} onGoTo={goToStep} />

        {/* PERIODO (año / semestre) */}
        <section className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-xs sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="year" className="text-sm font-semibold text-ink">
              Año <span className="text-maroon">*</span>
            </label>
            <input
              id="year"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                if (errors.year) setErrors((p) => ({ ...p, year: undefined }));
              }}
              className={inputClass(!!errors.year)}
            />
            {errors.year && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {errors.year}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="semester"
              className="text-sm font-semibold text-ink"
            >
              Semestre <span className="text-maroon">*</span>
            </label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                if (errors.semester)
                  setErrors((p) => ({ ...p, semester: undefined }));
              }}
              className={inputClass(!!errors.semester)}
            >
              <option value="">Seleccione un semestre</option>
              <option value="1">Semestre 1</option>
              <option value="2">Semestre 2</option>
            </select>
            {errors.semester && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {errors.semester}
              </p>
            )}
          </div>
        </section>

        {/* SECCIÓN ACTUAL */}
        <section className="rounded-2xl border border-ink/10 bg-white shadow-xs">
          <div className="flex items-start gap-4 border-b border-ink/10 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-maroon text-lg font-bold text-white">
              {section.number}
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">{section.title}</h2>
              {section.description && (
                <p className="mt-1 text-sm text-ink/60">
                  {section.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 p-6">
            {section.fields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* NAVEGACIÓN */}
          <div className="flex items-center justify-between gap-4 rounded-b-2xl border-t border-ink/10 bg-surface/60 px-6 py-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0 || sending}
              className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-maroon/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={sending}
              className="flex items-center gap-2 rounded-2xl bg-maroon px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : isLast ? (
                <>
                  <Send className="h-4 w-4" /> Enviar encuesta
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>

        <p className="text-center text-xs text-ink/50">
          La encuesta quedará pendiente hasta que un Superadmin la apruebe.
        </p>
      </div>
    </div>
  );
}
