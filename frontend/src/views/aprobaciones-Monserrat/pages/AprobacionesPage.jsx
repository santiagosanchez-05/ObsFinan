import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import PanelRevision from '../components/Aprobaciones.PanelRevision';
import {
  Search,
  ChevronDown,
  Eye,
  Check,
  X,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const SISTEMAS = {
  ica: {
    id: 'ica',
    label: 'ICA',
    columnaZona: 'Comuna',
    placeholderBusqueda: 'Buscar por comuna o encuestador...',
    filtroZona: 'Todas las comunas',
    descripcion:
      'Registros ICA pendientes de revisión. Al aprobarlos pasan a contar en dashboards.',
  },
  spe: {
    id: 'spe',
    label: 'SPE',
    columnaZona: 'Sector exportador',
    placeholderBusqueda: 'Buscar por sector, departamento o encuestador...',
    filtroZona: 'Todos los sectores',
    descripcion:
      'Registros SPE pendientes de revisión. Al aprobarlos se recalculan los índices del sector.',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatearFecha(valor) {
  if (!valor) return '-';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return '-';

  return fecha.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function diasEspera(valor) {
  if (!valor) return 0;

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return 0;

  const ms = Date.now() - fecha.getTime();

  return Math.max(0, Math.floor(ms / 86400000));
}

// El departamento llega como texto ("La Paz" o "La Paz, Santa Cruz").
function listaDepartamentos(registro) {
  return String(registro.departamento ?? '')
    .split(', ')
    .map((d) => d.trim())
    .filter((d) => d && d !== '-');
}

// Nombre corto para mostrar en diálogos y avisos.
function etiquetaRegistro(registro) {
  const zonas = (registro?.zonas ?? []).join(', ');
  if (zonas && registro?.periodo && registro.periodo !== '-') {
    return `${zonas} · ${registro.periodo}`;
  }
  return zonas || 'este registro';
}

/*
 * El backend puede devolver un array o un objeto como { pendientes: [...] }.
 */
function extraerPendientes(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.pendientes)) return data.pendientes;
  if (Array.isArray(data?.registros)) return data.registros;
  if (Array.isArray(data?.cargas)) return data.cargas;
  return [];
}

/*
 * La UI trabaja siempre con:
 * id, zonas, departamento, periodo, registros, encuestador,
 * sede, fecha, evento y respuestas.
 */
function normalizarRegistro(registro) {
  const zonasOrigen =
    registro.zonas ?? registro.sectores ?? registro.sectorExportador;

  const zonas = zonasOrigen
    ? Array.isArray(zonasOrigen)
      ? zonasOrigen
      : [zonasOrigen]
    : [];

  return {
    ...registro,

    id:
      registro.id ??
      registro.dataLoadId ??
      registro.data_load_id ??
      registro.cargaId ??
      registro.carga_id,

    zonas,

    departamento: registro.departamento ?? '-',

    periodo:
      registro.periodo ??
      registro.period ??
      (registro.semester && registro.year
        ? `${registro.semester}S ${registro.year}`
        : '-'),

    registros: registro.registros ?? 1,

    encuestador:
      registro.encuestador ??
      registro.surveyor ??
      registro.encuestadorNombre ??
      registro.encuestador_nombre ??
      '-',

    sede:
      registro.sede ??
      registro.campus ??
      registro.campusNombre ??
      registro.campus_nombre ??
      '-',

    fecha:
      registro.fecha ??
      registro.fechaCarga ??
      registro.fecha_carga ??
      registro.created_at ??
      registro.createdAt,

    evento:
      registro.evento ??
      registro.event ??
      registro.eventName ??
      registro.event_name ??
      '-',

    respuestas: registro.respuestas ?? [],
  };
}

// ---------------------------------------------------------------------------
// Acciones de cada fila
// ---------------------------------------------------------------------------

function AccionesFila({ onRevisar, onAprobar, onRechazar, disabled = false }) {
  return (
    <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onRevisar}
        className="inline-flex items-center gap-1 text-ink/50 transition hover:text-brand"
      >
        <Eye size={15} /> Ver detalle
      </button>

      <button
        type="button"
        onClick={onRechazar}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-ink/50 transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink/50"
      >
        <X size={15} /> Rechazar
      </button>

      <button
        type="button"
        onClick={onAprobar}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-maroon px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-maroon-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={13} /> Aprobar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const CLASE_SELECT =
  'appearance-none rounded-lg border border-line bg-card py-2 pl-3 pr-8 text-xs font-semibold text-ink-2 outline-none focus:border-brand';

export default function AprobacionesPage() {
  const { token, user } = useAuth();

  const rol = String(user?.rol ?? user?.role ?? '').toLowerCase();
  const esSuperadmin = rol === 'superadmin' || rol === 'super_admin';

  // SPE solo lo ve el Superadmin. Si el rol aún no se conoce, no se bloquea.
  const puedeVerSpe = esSuperadmin || !rol;

  const sistemasDisponibles = useMemo(
    () => Object.values(SISTEMAS).filter((s) => s.id !== 'spe' || puedeVerSpe),
    [puedeVerSpe],
  );

  const [sistema, setSistema] = useState('ica');

  const [busqueda, setBusqueda] = useState('');
  const [zona, setZona] = useState('');
  const [sede, setSede] = useState('');
  const [departamento, setDepartamento] = useState('');

  const [pendientes, setPendientes] = useState({ ica: [], spe: [] });
  const [cargando, setCargando] = useState({ ica: true, spe: puedeVerSpe });
  const [error, setError] = useState('');

  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [aviso, setAviso] = useState('');

  const cfg = SISTEMAS[sistema];
  const esSpe = sistema === 'spe';
  const lista = pendientes[sistema];
  const cargandoActual = cargando[sistema];

  // -------------------------------------------------------------------------
  // GET /api/ica/pendientes  y  GET /api/spe/pendientes
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelado = false;

    async function cargarSistema(id) {
      setCargando((prev) => ({ ...prev, [id]: true }));

      try {
        const res = await fetch(`/api/${id}/pendientes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              data.error ||
              `No se pudieron cargar los registros pendientes ${SISTEMAS[id].label}`,
          );
        }

        if (!cancelado) {
          const registros = extraerPendientes(data).map(normalizarRegistro);
          setPendientes((prev) => ({ ...prev, [id]: registros }));
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'Error de conexión con el servidor');
        }
      } finally {
        if (!cancelado) {
          setCargando((prev) => ({ ...prev, [id]: false }));
        }
      }
    }

    setError('');
    sistemasDisponibles.forEach((s) => cargarSistema(s.id));

    return () => {
      cancelado = true;
    };
  }, [token, sistemasDisponibles]);

  // -------------------------------------------------------------------------
  // Filtros
  // -------------------------------------------------------------------------

  const zonas = useMemo(
    () => [...new Set(lista.flatMap((r) => r.zonas ?? []))].sort(),
    [lista],
  );

  const sedes = useMemo(
    () => [...new Set(lista.map((r) => r.sede).filter(Boolean))].sort(),
    [lista],
  );

  const departamentos = useMemo(
    () => [...new Set(lista.flatMap((r) => listaDepartamentos(r)))].sort(),
    [lista],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return lista.filter((r) => {
      if (zona && !(r.zonas ?? []).includes(zona)) return false;

      if (esSpe) {
        if (departamento && !listaDepartamentos(r).includes(departamento)) {
          return false;
        }
      } else if (sede && r.sede !== sede) {
        return false;
      }

      if (!q) return true;

      return [
        (r.zonas ?? []).join(' '),
        r.encuestador,
        esSpe ? r.departamento : null,
      ]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q));
    });
  }, [lista, busqueda, zona, sede, departamento, esSpe]);

  const masAntigua = lista.length
    ? Math.max(...lista.map((r) => diasEspera(r.fecha)))
    : 0;

  // Cerrar el panel con Escape
  useEffect(() => {
    if (!detalle || accion) return undefined;

    const alTeclear = (e) => {
      if (e.key === 'Escape') setDetalle(null);
    };

    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [detalle, accion]);

  // Ocultar el aviso automáticamente
  useEffect(() => {
    if (!aviso) return undefined;

    const id = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  // -------------------------------------------------------------------------
  // Cambio de sistema
  // -------------------------------------------------------------------------

  function cambiarSistema(id) {
    setSistema(id);
    setBusqueda('');
    setZona('');
    setSede('');
    setDepartamento('');
    setAviso('');
    setError('');
    setDetalle(null);
  }

  // -------------------------------------------------------------------------
  // PATCH /api/:sistema/cargas/:id/estado
  // -------------------------------------------------------------------------

  async function confirmarAccion() {
    if (!accion) return;

    const { registro, tipo } = accion;

    if (!registro.id) {
      setError('El registro no tiene un identificador válido.');
      return;
    }

    setProcesando(true);
    setError('');

    try {
      const estado = tipo === 'aprobar' ? 'aprobada' : 'rechazada';

      const res = await fetch(`/api/${sistema}/cargas/${registro.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado,
          motivo: motivo.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'No se pudo actualizar el estado del registro',
        );
      }

      setPendientes((prev) => ({
        ...prev,
        [sistema]: prev[sistema].filter((r) => r.id !== registro.id),
      }));

      setAviso(
        tipo === 'aprobar'
          ? `${etiquetaRegistro(registro)} aprobado. Ya cuenta en los dashboards.`
          : `${etiquetaRegistro(registro)} rechazado. No contará en los dashboards.`,
      );

      setAccion(null);
      setDetalle(null);
      setMotivo('');
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el registro');
    } finally {
      setProcesando(false);
    }
  }

  const tarjetas = [
    {
      label: 'Registros pendientes',
      valor: cargandoActual ? '...' : lista.length,
      Icono: Clock,
      estilo: 'bg-[#fbf1de] dark:bg-white/10 text-[#b7891e]',
    },
    {
      label: 'Espera más larga',
      valor: cargandoActual ? '...' : `${masAntigua} d`,
      Icono: Clock,
      estilo: 'bg-[#e8f1fb] dark:bg-white/10 text-[#2f6fb0]',
    },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-card px-4 py-3 shadow-lg"
        >
          <CheckCircle2 size={16} className="mt-px shrink-0 text-brand" />

          <p className="text-xs font-medium text-ink">{aviso}</p>

          <button
            type="button"
            onClick={() => setAviso('')}
            aria-label="Cerrar aviso"
            className="-mr-1 shrink-0 rounded p-0.5 text-ink/40 hover:text-brand"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Confirmación aprobar */}
      <ConfirmDialog
        open={accion?.tipo === 'aprobar'}
        titulo="¿Aprobar este registro?"
        mensaje={`Se aprobará el registro de ${etiquetaRegistro(accion?.registro)} y se recalcularán los indicadores.`}
        textoConfirmar={procesando ? 'Procesando...' : 'Aprobar'}
        onConfirm={confirmarAccion}
        onCancel={() => !procesando && setAccion(null)}
      />

      {/* Confirmación rechazar */}
      {accion?.tipo === 'rechazar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl"
          >
            <h2 className="text-base font-bold text-ink">
              ¿Rechazar este registro?
            </h2>

            <p className="mt-1 text-sm text-muted">
              Se rechazará el registro de {etiquetaRegistro(accion.registro)}.
              No contará en los dashboards.
            </p>

            <label className="mt-4 block text-xs font-semibold text-ink-2">
              Motivo del rechazo{' '}
              <span className="font-normal text-muted">(opcional)</span>

              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={255}
                rows={3}
                placeholder="Ej.: faltan respuestas en la encuesta"
                className="mt-1.5 w-full resize-none rounded-lg border border-line px-3 py-2 text-xs font-normal text-ink-2 outline-none focus:border-brand"
              />
            </label>

            <p className="mt-1 text-right text-[10px] text-muted">
              {motivo.length}/255
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <button
                disabled={procesando}
                onClick={() => {
                  setAccion(null);
                  setMotivo('');
                }}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-2 hover:bg-surface disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                disabled={procesando}
                onClick={confirmarAccion}
                className="rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-maroon-light disabled:opacity-60"
              >
                {procesando ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de revisión */}
      {detalle && (
        <PanelRevision
          registro={detalle}
          sistema={sistema}
          procesando={procesando}
          onClose={() => setDetalle(null)}
          onAccion={(registro, tipo) => {
            setMotivo('');
            setAccion({ registro, tipo });
          }}
        />
      )}

      <div className="mx-auto max-w-[1120px]">
        {/* Encabezado */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Aprobación de encuestas
          </h1>

          <p className="mt-1 text-sm text-muted">{cfg.descripcion}</p>
        </div>

        {/* Tarjetas */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tarjetas.map(({ label, valor, Icono, estilo }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo}`}
              >
                <Icono size={16} />
              </span>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  {label}
                </p>

                <p className="text-xl font-bold text-ink">{valor}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs + filtros */}
        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-card p-3 shadow-sm lg:flex-row lg:items-center">
          <div className="inline-flex rounded-lg bg-surface p-1">
            {sistemasDisponibles.map((s) => (
              <button
                key={s.id}
                onClick={() => cambiarSistema(s.id)}
                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                  sistema === s.id
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-muted hover:text-ink-2'
                }`}
              >
                {s.label}

                <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  {cargando[s.id] ? '...' : pendientes[s.id].length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className={CLASE_SELECT}
              >
                <option value="">{cfg.filtroZona}</option>

                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>

            {/* SPE: filtro por departamento donde se hizo la encuesta */}
            {esSpe && (
              <div className="relative">
                <select
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className={CLASE_SELECT}
                >
                  <option value="">Todos los departamentos</option>

                  {departamentos.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            )}

            {/* ICA: filtro por sede (solo superadmin) */}
            {!esSpe && (esSuperadmin || !rol) ? (
              <div className="relative">
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className={CLASE_SELECT}
                >
                  <option value="">Todas las sedes</option>

                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            ) : null}

            <label className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={cfg.placeholderBusqueda}
                className="w-72 rounded-lg border border-line bg-card py-2 pl-8 pr-3 text-xs text-ink-2 outline-none focus:border-brand"
              />
            </label>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <span>{error}</span>

            <button
              onClick={() => setError('')}
              className="font-semibold hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tabla */}
        <section className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-subtle text-[9px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">{cfg.columnaZona}</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Encuestador</th>
                  <th className="px-4 py-3">Fecha de carga</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargandoActual ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted"
                    >
                      <Loader2
                        size={18}
                        className="mx-auto mb-2 animate-spin"
                      />
                      Cargando registros pendientes {cfg.label}...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted"
                    >
                      {lista.length === 0
                        ? 'No hay registros pendientes. Todo está al día.'
                        : 'Ningún registro coincide con los filtros. Cambia o limpia los filtros para ver más.'}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => {
                    const espera = diasEspera(r.fecha);

                    return (
                      <tr
                        key={r.id}
                        className="border-t border-line text-ink-2 hover:bg-brand-soft"
                      >
                        <td className="px-4 py-3 font-semibold text-ink">
                          {(r.zonas ?? []).join(', ') || '-'}
                        </td>

                        <td className="px-4 py-3">{r.periodo}</td>

                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">
                            {r.encuestador}
                          </p>

                          <p className="text-[10px] text-muted">
                            {esSpe
                              ? `Encuesta en ${r.departamento || '-'}`
                              : `Sede ${r.sede}`}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p>{formatearFecha(r.fecha)}</p>

                          <p
                            className={`text-[10px] ${
                              espera >= 3
                                ? 'font-semibold text-[#b7891e]'
                                : 'text-muted'
                            }`}
                          >
                            {espera === 0 ? 'Hoy' : `Hace ${espera} d`}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <AccionesFila
                            disabled={procesando}
                            onRevisar={() => setDetalle(r)}
                            onRechazar={() =>
                              setAccion({ registro: r, tipo: 'rechazar' })
                            }
                            onAprobar={() =>
                              setAccion({ registro: r, tipo: 'aprobar' })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[10px] text-muted">
            <span>
              Mostrando {filtrados.length} de {lista.length} registros pendientes
            </span>

            {procesando && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Procesando...
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}