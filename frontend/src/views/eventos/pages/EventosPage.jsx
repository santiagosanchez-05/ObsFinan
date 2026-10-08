import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Plus, Search, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import RoleGate from '../../../shared/RoleGate';
import { headersDe, partesFecha } from '../eventosUtils';

// Santiago — US43. Agenda pública de eventos (próximos y pasados).
// El encuestador además ve dónde puede anotarse y en cuáles ya está.
const PERIODOS = [
  { valor: 'proximos', nombre: 'Próximos' },
  { valor: 'pasados', nombre: 'Pasados' },
];

export default function EventosPage() {
  const { token, user } = useAuth();
  const esStaff = user?.role === 'admin' || user?.role === 'superadmin';
  const esEncuestador = user?.role === 'encuestador';

  const [periodo, setPeriodo] = useState('proximos');
  const [campusId, setCampusId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  // El encuestador entra viendo solo los eventos donde puede participar.
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const filtrarDisponibles = esEncuestador && soloDisponibles;

  // Respuesta de la última búsqueda, junto con la consulta que la pidió:
  // mientras no coincida con la consulta actual, se está cargando.
  const [resultado, setResultado] = useState({ consulta: null, datos: null, error: '' });

  // Espera a que el usuario deje de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const params = new URLSearchParams({ periodo: filtrarDisponibles ? 'proximos' : periodo, page: String(pagina) });
  if (filtrarDisponibles) params.set('disponibles', 'true');
  else if (campusId) params.set('campusId', campusId);
  if (q) params.set('q', q);
  const consulta = params.toString();

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/events?${consulta}`, { headers: headersDe(token) })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la agenda');
        if (!cancelado) setResultado({ consulta, datos: data, error: '' });
      })
      .catch((err) => {
        if (!cancelado) {
          setResultado((previo) => ({ consulta, datos: previo.datos, error: err.message || 'No se pudo cargar la agenda' }));
        }
      });
    return () => {
      cancelado = true;
    };
  }, [consulta, token]);

  const { datos, error } = resultado;
  const cargando = resultado.consulta !== consulta;
  const eventos = datos?.eventos ?? [];
  const paginacion = datos?.paginacion;
  const sedes = datos?.opcionesFiltros?.sedes ?? [];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">Agenda</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Eventos</h1>
            <p className="mt-1 text-sm text-ink/60">
              Charlas, talleres y jornadas de encuesta del Observatorio en las sedes de Univalle.
            </p>
          </div>
          <RoleGate allow={['admin', 'superadmin']}>
            <Link
              to="/eventos/nuevo"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light"
            >
              <Plus size={16} /> Registrar evento
            </Link>
          </RoleGate>
        </div>

        {esEncuestador && (
          <label className="mt-5 flex items-center gap-2 rounded-xl border border-maroon/20 bg-maroon/5 px-4 py-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => {
                setSoloDisponibles(e.target.checked);
                setPagina(1);
              }}
              className="h-4 w-4 accent-maroon"
            />
            Solo eventos donde puedo participar como encuestador
            <span className="hidden text-ink/50 sm:inline">(con encuesta, de mi sede y que no pasaron)</span>
          </label>
        )}

        <div className={`${esEncuestador ? 'mt-3' : 'mt-5'} flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:flex-row md:items-center`}>
          {!filtrarDisponibles && (
            <div className="flex rounded-lg bg-surface p-1" role="tablist" aria-label="Periodo">
              {PERIODOS.map((p) => (
                <button
                  key={p.valor}
                  role="tab"
                  aria-selected={periodo === p.valor}
                  onClick={() => {
                    setPeriodo(p.valor);
                    setPagina(1);
                  }}
                  className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition md:flex-none ${
                    periodo === p.valor ? 'bg-white text-maroon shadow-sm' : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}

          {!filtrarDisponibles && (
            <select
              aria-label="Sede"
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setPagina(1);
              }}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}

          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título o lugar"
              className="w-full rounded-lg border border-black/10 py-2 pl-9 pr-3 text-sm focus:border-maroon focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {cargando && !datos && <p className="mt-10 text-center text-sm text-ink/50">Cargando eventos…</p>}

        {!error && datos && eventos.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <CalendarDays size={28} className="mx-auto text-ink/30" />
            <p className="mt-3 font-semibold text-ink">
              {filtrarDisponibles
                ? 'No hay eventos disponibles para anotarte'
                : periodo === 'proximos'
                  ? 'No hay eventos próximos'
                  : 'No hay eventos pasados'}
            </p>
            <p className="mt-1 text-sm text-ink/50">
              {q || campusId ? 'Prueba con otra búsqueda o sede.' : 'Vuelve pronto para ver las novedades.'}
            </p>
          </div>
        )}

        {eventos.length > 0 && (
          <ul className={`mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${cargando ? 'opacity-60' : ''}`}>
            {eventos.map((evento) => (
              <li key={evento.id}>
                <TarjetaEvento evento={evento} mostrarEncuestas={esStaff} mostrarParticipacion={esEncuestador} />
              </li>
            ))}
          </ul>
        )}

        {paginacion && paginacion.totalPaginas > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Paginación">
            <button
              onClick={() => setPagina((p) => p - 1)}
              disabled={paginacion.pagina <= 1}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-ink disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-ink/60">
              Página {paginacion.pagina} de {paginacion.totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => p + 1)}
              disabled={paginacion.pagina >= paginacion.totalPaginas}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-ink disabled:opacity-40"
            >
              Siguiente
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}

function TarjetaEvento({ evento, mostrarEncuestas, mostrarParticipacion }) {
  const { dia, mes } = partesFecha(evento.fecha);

  return (
    <Link
      to={`/eventos/${evento.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-maroon to-maroon-light">
        {evento.imagenUrl ? (
          <img src={evento.imagenUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <CalendarDays size={40} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" />
        )}
        <div className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-center leading-tight shadow">
          <p className="text-lg font-bold text-maroon">{dia}</p>
          <p className="text-[11px] font-semibold uppercase text-ink/60">{mes}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-semibold text-ink group-hover:text-maroon">{evento.titulo}</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink/60">
          <li className="flex items-center gap-2">
            <Clock size={14} className="shrink-0" /> {evento.hora} · {evento.modalidadNombre}
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0" /> <span className="truncate">{evento.lugar}</span>
          </li>
          <li className="flex items-center gap-2">
            <Building2 size={14} className="shrink-0" /> Sede {evento.sede}
          </li>
        </ul>

        {mostrarEncuestas && (evento.hasIca || evento.hasSpe) && (
          <div className="mt-auto flex gap-2 pt-4">
            {evento.hasIca && <span className="rounded-full bg-maroon/10 px-2.5 py-0.5 text-xs font-semibold text-maroon">Encuesta ICA</span>}
            {evento.hasSpe && <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold text-ink">Encuesta SPE</span>}
          </div>
        )}

        {mostrarParticipacion && (evento.participando || evento.puedeParticipar) && (
          <div className="mt-auto pt-4">
            {evento.participando ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={12} /> Ya estás anotado
              </span>
            ) : (
              <span className="rounded-full bg-maroon/10 px-2.5 py-0.5 text-xs font-semibold text-maroon">Puedes participar</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
