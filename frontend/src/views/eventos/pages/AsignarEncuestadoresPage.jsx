import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import apiFetch from '../../../shared/apiFetch';
import { formatearFecha, headersDe, hoyIso } from '../eventosUtils';

// Santiago — US55. El Admin (su sede) o el Superadmin asigna y quita
// encuestadores de un evento con encuesta. Muestra también a los que se
// anotaron solos desde el detalle del evento (misma tabla event_surveyor).
export default function AsignarEncuestadoresPage() {
  const { id } = useParams();
  const { token } = useAuth();

  // `version` sube después de asignar o quitar para volver a pedir la lista.
  const [version, setVersion] = useState(0);
  const [carga, setCarga] = useState({ clave: null, datos: null, error: '' });
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(null); // id del encuestador en proceso
  const [errorAccion, setErrorAccion] = useState('');
  const [aQuitar, setAQuitar] = useState(null);

  const clave = `${id}-${version}`;

  useEffect(() => {
    let cancelado = false;
    apiFetch(`/api/events/${id}/encuestadores`, { headers: headersDe(token) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el evento');
        if (!cancelado) setCarga({ clave, datos: data, error: '' });
      })
      .catch((err) => {
        if (!cancelado) setCarga({ clave, datos: null, error: err.message || 'No se pudo cargar el evento' });
      });
    return () => {
      cancelado = true;
    };
  }, [id, token, clave]);

  async function cambiar(metodo, userId) {
    setErrorAccion('');
    setEnviando(userId);
    try {
      const res = await apiFetch(
        metodo === 'POST' ? `/api/events/${id}/encuestadores` : `/api/events/${id}/encuestadores/${userId}`,
        {
          method: metodo,
          headers: { ...headersDe(token), 'Content-Type': 'application/json' },
          body: metodo === 'POST' ? JSON.stringify({ userId }) : undefined,
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErrorAccion(data.error || 'No se pudo completar la acción');
        return;
      }
      setVersion((v) => v + 1);
    } catch {
      setErrorAccion('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  const cargando = carga.clave !== clave && !carga.datos;
  const { datos, error } = carga;

  if (cargando) return <p className="py-24 text-center text-sm text-ink/50">Cargando encuestadores…</p>;

  if (error && !datos) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <Users size={32} className="mx-auto text-ink/30" />
        <h1 className="mt-3 text-xl font-bold text-ink">{error}</h1>
        <Link to="/eventos" className="mt-4 inline-block text-sm font-semibold text-maroon hover:underline">
          Volver a la agenda
        </Link>
      </main>
    );
  }

  const { evento, asignados, disponibles } = datos;
  const conEncuesta = evento.hasIca || evento.hasSpe;
  const yaPaso = evento.fecha < hoyIso();
  const editable = conEncuesta && !yaPaso;
  const termino = busqueda.trim().toLowerCase();
  const filtrados = termino
    ? disponibles.filter((p) => p.nombre.toLowerCase().includes(termino) || p.correo.toLowerCase().includes(termino))
    : disponibles;
  const encuestas = [evento.hasIca && 'ICA', evento.hasSpe && 'SPE'].filter(Boolean).join(' y ');

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to={`/eventos/${id}`} className="inline-flex items-center gap-1 text-xs font-medium text-maroon hover:underline">
          <ArrowLeft size={14} /> Volver al evento
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Encuestadores del evento</h1>
        <p className="mt-1 text-sm text-ink/60">
          {evento.titulo} · {formatearFecha(evento.fecha)} · Sede {evento.sede}
          {encuestas && ` · Encuesta ${encuestas}`}
        </p>

        {!conEncuesta && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este evento no lleva encuestas, así que no se le asignan encuestadores. Puedes habilitar la encuesta ICA o SPE editando el evento.
          </p>
        )}
        {conEncuesta && yaPaso && (
          <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-ink/70 ring-1 ring-black/10">
            El evento ya pasó: solo puedes ver quiénes participaron.
          </p>
        )}
        {(errorAccion || error) && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {errorAccion || error}
          </p>
        )}

        <div className={`mt-5 grid gap-5 ${editable ? 'lg:grid-cols-2' : ''}`}>
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" aria-labelledby="titulo-asignados">
            <h2 id="titulo-asignados" className="font-semibold text-ink">
              Asignados <span className="text-ink/40">({asignados.length})</span>
            </h2>
            {asignados.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">Todavía no hay encuestadores en este evento.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/5">
                {asignados.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.nombre}</p>
                      <p className="truncate text-xs text-ink/50">{p.correo}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          p.seAnotoSolo ? 'bg-green-50 text-green-700' : 'bg-maroon/10 text-maroon'
                        }`}
                      >
                        {p.seAnotoSolo ? 'Se anotó solo' : 'Asignado'}
                      </span>
                    </div>
                    {editable && (
                      <button
                        onClick={() => setAQuitar(p)}
                        disabled={enviando === p.id}
                        aria-label={`Quitar a ${p.nombre}`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <UserMinus size={14} /> Quitar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {editable && (
            <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" aria-labelledby="titulo-disponibles">
              <h2 id="titulo-disponibles" className="font-semibold text-ink">
                Encuestadores disponibles de la sede <span className="text-ink/40">({disponibles.length})</span>
              </h2>
              <label className="relative mt-3 block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o correo"
                  className="w-full rounded-lg border border-black/10 py-2 pl-9 pr-3 text-sm focus:border-maroon focus:outline-none"
                />
              </label>
              {disponibles.length === 0 ? (
                <p className="mt-4 text-sm text-ink/50">
                  No hay más encuestadores activos en la sede {evento.sede}.{' '}
                  <Link to="/encuestadores/nuevo" className="font-semibold text-maroon hover:underline">
                    Registrar un encuestador
                  </Link>
                </p>
              ) : filtrados.length === 0 ? (
                <p className="mt-4 text-sm text-ink/50">Nadie coincide con la búsqueda.</p>
              ) : (
                <ul className="mt-3 max-h-[420px] divide-y divide-black/5 overflow-y-auto">
                  {filtrados.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{p.nombre}</p>
                        <p className="truncate text-xs text-ink/50">{p.correo}</p>
                      </div>
                      <button
                        onClick={() => cambiar('POST', p.id)}
                        disabled={enviando === p.id}
                        aria-label={`Asignar a ${p.nombre}`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-maroon px-3 py-1.5 text-xs font-semibold text-white hover:bg-maroon-light disabled:opacity-50"
                      >
                        <UserPlus size={14} /> {enviando === p.id ? 'Asignando…' : 'Asignar'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(aQuitar)}
        titulo="Quitar encuestador"
        mensaje={`¿Seguro que quieres quitar a ${aQuitar?.nombre} de este evento? Ya no lo verá en "Mis eventos" ni podrá registrar encuestas en él.`}
        textoConfirmar="Quitar"
        onConfirm={() => {
          const p = aQuitar;
          setAQuitar(null);
          cambiar('DELETE', p.id);
        }}
        onCancel={() => setAQuitar(null)}
      />
    </main>
  );
}
