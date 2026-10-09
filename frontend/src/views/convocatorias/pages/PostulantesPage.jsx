import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

// Estados (deben coincidir con el backend)
const STATUS = {
  PENDIENTE: 1,
  APROBADO: 2,
  RECHAZADO: 3,
};

const STATUS_CONFIG = {
  [STATUS.PENDIENTE]: {
    label: 'Pendiente',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-700',
  },
  [STATUS.APROBADO]: {
    label: 'Aceptado',
    badge: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-700',
  },
  [STATUS.RECHAZADO]: {
    label: 'Rechazado',
    badge: 'bg-red-50 text-red-700',
    dot: 'bg-red-700',
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: String(STATUS.PENDIENTE), label: 'Pendientes' },
  { value: String(STATUS.APROBADO), label: 'Aceptados' },
  { value: String(STATUS.RECHAZADO), label: 'Rechazados' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name', label: 'Nombre (A-Z)' },
];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const normalize = (value) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
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
    <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white px-6 py-5 shadow-xs">
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
    <label className="relative inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white py-2 pl-4 pr-9 text-[11px] text-ink/60 shadow-xs">
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <div className="mt-1 break-words text-xs text-ink">{children}</div>
    </div>
  );
}

function PostulanteModal({ postulante, onClose, onChangeStatus }) {
  const isPending = postulante.status === STATUS.PENDIENTE;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="postulante-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-ink/10 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-maroon">
              Gestión de eventos
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 id="postulante-modal-title" className="text-xl font-semibold text-ink">
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
            {postulante.nombreCompleto || 'Sin nombre'}
          </p>
          <div className="mt-5 border-t border-ink/10 pt-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <DetailField label="Correo electrónico">{postulante.correo || '—'}</DetailField>
              <DetailField label="Teléfono">
                {postulante.telefono || 'No especificado'}
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
            className="rounded-md border border-ink/15 bg-white px-4 py-1.5 text-[11px] font-medium text-ink transition hover:bg-surface"
          >
            Cerrar
          </button>
          {isPending && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeStatus(postulante, STATUS.RECHAZADO)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-700 bg-white px-4 py-1.5 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
              >
                <X className="h-3 w-3" />
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => onChangeStatus(postulante, STATUS.APROBADO)}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 bg-white px-4 py-1.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50"
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
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selected, setSelected] = useState(null);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const loadPostulantes = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/convocatorias/${id}/postulaciones`, {
          headers: authHeaders,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message || 'No se pudo cargar el listado de postulantes.');
        }
        setConvocatoria(data.convocatoria ?? null);
        setStats(
          data.stats ?? { pendientes: 0, aprobados: 0, rechazados: 0, total: 0 }
        );
        setPostulantes(Array.isArray(data.postulantes) ? data.postulantes : []);
      } catch (err) {
        setError(err.message || 'Ocurrió un error al cargar los postulantes.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, authHeaders]
  );

  useEffect(() => {
    loadPostulantes();
  }, [loadPostulantes]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const closeModal = useCallback(() => setSelected(null), []);

  const handleChangeStatus = async (postulante, newStatus) => {
    setActionId(postulante.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/convocatorias/postulaciones/${postulante.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo actualizar el postulante.');
      }
      setFeedback({
        type: 'success',
        message:
          data?.message ||
          (newStatus === STATUS.APROBADO
            ? 'Postulante aceptado correctamente.'
            : 'Postulante rechazado correctamente.'),
      });
      await loadPostulantes({ silent: true });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Ocurrió un error al actualizar el postulante.',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleModalAction = (postulante, newStatus) => {
    setSelected(null);
    handleChangeStatus(postulante, newStatus);
  };

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    const list = postulantes.filter((p) => {
      const matchesStatus =
        statusFilter === 'all' || String(p.status) === statusFilter;
      const matchesSearch =
        !term ||
        normalize(p.nombreCompleto).includes(term) ||
        normalize(p.correo).includes(term);
      return matchesStatus && matchesSearch;
    });

    const time = (p) => new Date(p.fechaSolicitud).getTime() || 0;
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') return time(a) - time(b);
      if (sortBy === 'name') {
        return (a.nombreCompleto ?? '').localeCompare(b.nombreCompleto ?? '', 'es');
      }
      return time(b) - time(a);
    });
  }, [postulantes, search, statusFilter, sortBy]);

  const total = stats.total ?? postulantes.length;

  return (
    <div className="min-h-full bg-surface px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-maroon">
            Gestión de eventos
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Listado de postulantes</h1>
          <p className="mt-1.5 text-xs text-ink/60">
            Revisa y gestiona las solicitudes de inscripción a los eventos.
          </p>
        </div>

        {convocatoria && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-6 py-5 shadow-xs">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-ink/50">Evento seleccionado</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {convocatoria.titulo || 'Sin título'}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink/50">
                ID #{convocatoria.id}
              </p>
            </div>
            <Link
              to="/convocatorias"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 py-1.5 text-[11px] font-semibold text-ink transition hover:border-maroon hover:text-maroon"
            >
              Cambiar evento
              <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs shadow-xs ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1">{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar mensaje"
              className="shrink-0 opacity-60 transition hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-[11px] font-medium text-ink/60">
            {total} {total === 1 ? 'postulante registrado' : 'postulantes registrados'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Pendientes" value={stats.pendientes ?? 0} status={STATUS.PENDIENTE} />
            <KpiCard label="Aceptados" value={stats.aprobados ?? 0} status={STATUS.APROBADO} />
            <KpiCard label="Rechazados" value={stats.rechazados ?? 0} status={STATUS.RECHAZADO} />
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
              className="w-full rounded-full border border-ink/10 bg-white py-2 pl-10 pr-4 text-[11px] text-ink shadow-xs outline-none transition placeholder:text-ink/40 focus:border-maroon focus:ring-2 focus:ring-maroon/20"
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

        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xs">
          <div className="border-b border-ink/10 px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">Postulantes registrados</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink/60">
              <Loader2 className="h-4 w-4 animate-spin text-maroon" />
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
                  ? 'Aún no hay postulantes para esta convocatoria.'
                  : 'No se encontraron postulantes con esos filtros.'}
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
                            className="text-left text-xs font-semibold text-ink transition hover:text-maroon hover:underline"
                          >
                            {p.nombreCompleto || 'Sin nombre'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-ink/60">{p.correo || '—'}</td>
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
                                  onClick={() => handleChangeStatus(p, STATUS.APROBADO)}
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-700 bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                                  Aceptar
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleChangeStatus(p, STATUS.RECHAZADO)}
                                  className="rounded-md border border-red-700 bg-white px-3 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelected(p)}
                                className="text-[11px] font-bold text-maroon transition hover:underline"
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
          onChangeStatus={handleModalAction}
        />
      )}
    </div>
  );
}