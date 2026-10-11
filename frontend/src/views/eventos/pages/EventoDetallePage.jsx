import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, Building2, Users, Video, ExternalLink, Pencil, Trash2, UserPlus, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import apiFetch from '../../../shared/apiFetch';
import { formatearFecha, headersDe, hoyIso, puedeGestionarEvento } from '../eventosUtils';

// Santiago — US47 (detalle) y US46 (eliminar). El encuestador se anota solo desde aquí.
export default function EventoDetallePage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Resultado de la carga del evento `id`; si es de otro id, se está cargando.
  const [carga, setCarga] = useState({ id: null, estado: 'cargando', evento: null }); // listo | no-encontrado | error
  const [confirmar, setConfirmar] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/events/${id}`, { headers: headersDe(token) })
      .then(async (res) => {
        if (cancelado) return;
        if (res.status === 404 || res.status === 400) return setCarga({ id, estado: 'no-encontrado', evento: null });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelado) setCarga({ id, estado: 'listo', evento: data });
      })
      .catch(() => {
        if (!cancelado) setCarga({ id, estado: 'error', evento: null });
      });
    return () => {
      cancelado = true;
    };
  }, [id, token]);

  async function eliminar() {
    setConfirmar(false);
    setErrorEliminar('');
    try {
      const res = await apiFetch(`/api/events/${id}`, { method: 'DELETE', headers: headersDe(token) });
      const data = await res.json();
      if (!res.ok) {
        setErrorEliminar(data.error || 'No se pudo eliminar el evento');
        return;
      }
      navigate('/eventos', { replace: true });
    } catch {
      setErrorEliminar('No se pudo conectar con el servidor. Intenta de nuevo.');
    }
  }

  const estado = carga.id === id ? carga.estado : 'cargando';
  const { evento } = carga;

  if (estado === 'cargando') {
    return <p className="py-24 text-center text-sm text-ink/50">Cargando evento…</p>;
  }

  if (estado !== 'listo') {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <CalendarDays size={32} className="mx-auto text-ink/30" />
        <h1 className="mt-3 text-xl font-bold text-ink">
          {estado === 'no-encontrado' ? 'Este evento no existe o fue eliminado' : 'No se pudo cargar el evento'}
        </h1>
        <Link to="/eventos" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Volver a la agenda
        </Link>
      </main>
    );
  }

  const gestiona = puedeGestionarEvento(user, evento);
  const esVirtual = evento.modalidad === 2;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link to="/eventos" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <ArrowLeft size={14} /> Volver a la agenda
        </Link>

        <article className="mt-3 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className={`relative bg-gradient-to-br from-maroon to-maroon-light ${evento.imagenUrl ? 'aspect-[21/9]' : 'h-28 sm:h-36'}`}>
            {evento.imagenUrl ? (
              <img src={evento.imagenUrl} alt={`Imagen del evento ${evento.titulo}`} className="h-full w-full object-cover" />
            ) : (
              <CalendarDays size={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" />
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand">{formatearFecha(evento.fecha)}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{evento.titulo}</h1>
              </div>

              {gestiona && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    to={`/eventos/${evento.id}/editar`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
                  >
                    <Pencil size={14} /> Editar
                  </Link>
                  {(evento.hasIca || evento.hasSpe) && (
                    <Link
                      to={`/eventos/${evento.id}/encuestadores`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
                    >
                      <UserPlus size={14} /> Encuestadores
                    </Link>
                  )}
                  <button
                    onClick={() => setConfirmar(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              )}
            </div>

            {errorEliminar && (
              <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
                {errorEliminar}
              </p>
            )}

            <dl className="mt-6 grid gap-4 border-y border-line/70 py-5 sm:grid-cols-2">
              <Dato icono={Clock} etiqueta="Hora" valor={`${evento.hora} · ${evento.modalidadNombre}`} />
              <Dato icono={esVirtual ? Video : MapPin} etiqueta={esVirtual ? 'Plataforma' : 'Lugar'} valor={evento.lugar} />
              <Dato icono={Building2} etiqueta="Sede" valor={evento.sede} />
              <Dato icono={Users} etiqueta="Cupos" valor={evento.cupos ? `${evento.cupos} personas` : 'Sin límite de cupos'} />
            </dl>

            {gestiona && (
              <p className="mt-4 text-sm text-ink/60">
                Encuestas en este evento:{' '}
                <span className="font-medium text-ink">
                  {[evento.hasIca && 'ICA', evento.hasSpe && 'SPE'].filter(Boolean).join(' y ') || 'ninguna (evento sin encuesta)'}
                </span>
              </p>
            )}

            {user?.role === 'encuestador' && (
              <Participacion
                evento={evento}
                user={user}
                token={token}
                onCambio={(participando) => setCarga((c) => ({ ...c, evento: { ...c.evento, participando } }))}
              />
            )}

            {evento.descripcion && (
              <section className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Descripción</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{evento.descripcion}</p>
              </section>
            )}

            {evento.enlaceExterno && (
              <a
                href={evento.enlaceExterno}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-maroon px-5 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light"
              >
                Inscribirse / más información <ExternalLink size={15} />
              </a>
            )}
          </div>
        </article>
      </div>

      <ConfirmDialog
        open={confirmar}
        titulo="Eliminar evento"
        mensaje={`¿Seguro que quieres eliminar "${evento.titulo}"? Se quitará de la agenda y se cancelarán sus asignaciones de encuestadores.`}
        textoConfirmar="Eliminar"
        onConfirm={eliminar}
        onCancel={() => setConfirmar(false)}
      />
    </main>
  );
}

function Dato({ icono: Icono, etiqueta, valor }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-maroon/10">
        <Icono size={16} className="text-brand" />
      </span>
      <div>
        <dt className="text-xs text-ink/50">{etiqueta}</dt>
        <dd className="text-sm font-medium text-ink">{valor}</dd>
      </div>
    </div>
  );
}

// Encuestador: se anota (sin límite) o se baja de un evento con encuesta de su sede.
function Participacion({ evento, user, token, onCambio }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const deSuSede = Number(evento.campusId) === Number(user.campusId);
  const conEncuesta = evento.hasIca || evento.hasSpe;
  const yaPaso = evento.fecha < hoyIso();
  if (!deSuSede || !conEncuesta) return null;

  const encuestas = [evento.hasIca && 'ICA', evento.hasSpe && 'SPE'].filter(Boolean).join(' y ');

  async function cambiar(metodo) {
    setConfirmarBaja(false);
    setError('');
    setEnviando(true);
    try {
      const res = await apiFetch(`/api/events/${evento.id}/participacion`, { method: metodo, headers: headersDe(token) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo completar la acción');
        return;
      }
      onCambio(data.participando);
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-brand/20 bg-maroon/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ClipboardCheck size={20} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <h2 className="text-sm font-semibold text-ink">
              {evento.participando ? (yaPaso ? 'Participaste como encuestador' : 'Estás anotado como encuestador') : 'Este evento necesita encuestadores'}
            </h2>
            <p className="mt-0.5 text-sm text-ink/60">
              {evento.participando
                ? `Lo verás en "Mis eventos" para registrar encuestas ${encuestas}.`
                : `Se toma la encuesta ${encuestas}.`}
            </p>
          </div>
        </div>

        {!yaPaso &&
          (evento.participando ? (
            <button
              onClick={() => setConfirmarBaja(true)}
              disabled={enviando}
              className="shrink-0 rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-60"
            >
              Dejar de participar
            </button>
          ) : (
            <button
              onClick={() => cambiar('POST')}
              disabled={enviando}
              className="shrink-0 rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
            >
              {enviando ? 'Anotando…' : 'Quiero participar como encuestador'}
            </button>
          ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmarBaja}
        titulo="Dejar de participar"
        mensaje="Ya no verás este evento en Mis eventos ni podrás registrar encuestas en él. Puedes volver a anotarte mientras no haya pasado."
        textoConfirmar="Dejar de participar"
        onConfirm={() => cambiar('DELETE')}
        onCancel={() => setConfirmarBaja(false)}
      />
    </section>
  );
}
