import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, ShieldCheck, UserX, UserCheck, Search, Eye, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';

// Mismos tokens de marca que el resto de la app (frontend/src/index.css) — a
// mano acá porque los gráficos SVG necesitan el hex, no clases de Tailwind.
const MAROON = '#9E0044';
const MAROON_LIGHT = '#BA254A';

const ROL_LABEL = { superadmin: 'Superadmin', admin: 'Admin', encuestador: 'Encuestador' };
const COLORES_ROL = [MAROON, MAROON_LIGHT, '#E4A8BB'];

export default function UsuariosPage() {
  const { token, user } = useAuth();
  const [estado, setEstado] = useState({ cargando: true, datos: null, error: null });
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [campuses, setCampuses] = useState([]);
  const [pagina, setPagina] = useState(1); // US8
  const [usuarioAConfirmar, setUsuarioAConfirmar] = useState(null); // { id, nombre, activo } | null
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // US9 — debounce del texto de búsqueda para no disparar un fetch por cada tecla.
  // Cambiar un filtro vuelve a la primera página (en el mismo render, para no
  // pedir primero la página vieja con el filtro nuevo).
  const ultimaBusqueda = useRef('');
  useEffect(() => {
    const id = setTimeout(() => {
      const termino = busqueda.trim();
      if (termino === ultimaBusqueda.current) return;
      ultimaBusqueda.current = termino;
      setBusquedaDebounced(termino);
      setPagina(1);
    }, 350);
    return () => clearTimeout(id);
  }, [busqueda]);

  function cambiarFiltro(setter) {
    return (e) => {
      setter(e.target.value);
      setPagina(1);
    };
  }

  useEffect(() => {
    fetch('/api/users/campuses', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setCampuses(Array.isArray(data) ? data : []))
      .catch(() => setCampuses([]));
  }, [token]);

  async function cargar() {
    try {
      const params = new URLSearchParams();
      if (busquedaDebounced) params.set('q', busquedaDebounced);
      if (rolFiltro) params.set('rol', rolFiltro);
      if (sedeFiltro) params.set('campusId', sedeFiltro);
      if (pagina > 1) params.set('page', String(pagina));
      const qs = params.toString();
      const res = await fetch(`/api/users${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la información');
      setEstado({ cargando: false, datos: data, error: null });
    } catch {
      setEstado({ cargando: false, datos: null, error: 'No se pudo cargar la información de usuarios.' });
    }
  }

  // Búsqueda/filtro por servidor (US9): cada cambio de texto (ya debounced),
  // rol o sede vuelve a pedir el listado. Stats y gráficos los recalcula el
  // backend siempre sobre el total, así que no se ven afectados.
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, busquedaDebounced, rolFiltro, sedeFiltro, pagina]);

  async function confirmarCambioEstado() {
    if (!usuarioAConfirmar) return;
    setCambiandoEstado(true);
    try {
      await fetch(`/api/users/${usuarioAConfirmar.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activo: !usuarioAConfirmar.activo }),
      });
      await cargar();
    } finally {
      setCambiandoEstado(false);
      setUsuarioAConfirmar(null);
    }
  }

  if (estado.cargando) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-ink/50">Cargando...</main>;
  }

  if (estado.error) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-maroon">{estado.error}</main>;
  }

  const { stats, porSede, porRol, usuarios } = estado.datos;
  // Respaldo por si el backend todavía no manda paginación (una sola página).
  const paginacion = estado.datos.paginacion ?? { pagina: 1, totalPaginas: 1, total: usuarios.length };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">Panel Superadmin</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Resumen general</h1>
        <p className="mt-1 text-sm text-ink/60">Gestión de usuarios y sedes del observatorio</p>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users size={20} />} label="Total de usuarios" value={stats.totalUsuarios} />
          <StatCard icon={<Building2 size={20} />} label="Sedes activas" value={stats.sedesActivas} />
          <StatCard icon={<ShieldCheck size={20} />} label="Admins activos" value={stats.adminsActivos} />
          <StatCard icon={<UserX size={20} />} label="Cuentas bloqueadas" value={stats.cuentasInactivas} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-ink">Usuarios por sede</h2>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porSede} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eef0f1" />
                  <XAxis dataKey="sede" tick={{ fontSize: 10, fill: '#69716e' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#69716e' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, 'Usuarios']} />
                  <Bar dataKey="total" fill={MAROON} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-ink">Usuarios por rol</h2>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porRol} dataKey="total" nameKey="rol" innerRadius="65%" outerRadius="90%" paddingAngle={2}>
                    {porRol.map((entry, i) => (
                      <Cell key={entry.rol} fill={COLORES_ROL[i % COLORES_ROL.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, ROL_LABEL[name] ?? name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-ink/60">
              {porRol.map((entry, i) => (
                <span key={entry.rol} className="inline-flex items-center gap-1">
                  <i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORES_ROL[i % COLORES_ROL.length] }} />
                  {ROL_LABEL[entry.rol] ?? entry.rol}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-black/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-ink">Listado de usuarios</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block sm:w-72">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, apellido o sede"
                  className="w-full rounded-lg border border-black/10 py-2 pl-9 pr-3 text-xs focus:border-maroon focus:outline-none"
                />
              </label>
              <select
                value={rolFiltro}
                onChange={cambiarFiltro(setRolFiltro)}
                aria-label="Filtrar por rol"
                className="rounded-lg border border-black/10 py-2 px-3 text-xs focus:border-maroon focus:outline-none"
              >
                <option value="">Todos los roles</option>
                {Object.entries(ROL_LABEL).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>{etiqueta}</option>
                ))}
              </select>
              <select
                value={sedeFiltro}
                onChange={cambiarFiltro(setSedeFiltro)}
                aria-label="Filtrar por sede"
                className="rounded-lg border border-black/10 py-2 px-3 text-xs focus:border-maroon focus:outline-none"
              >
                <option value="">Todas las sedes</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <Link
                to="/superadmin/usuarios/nuevo"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white hover:bg-maroon-light"
              >
                <Plus size={14} /> Nuevo Usuario
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-ink/50">
                <tr>
                  {['Nombre', 'Apellidos', 'Correo', 'Sede', 'Rol', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-black/5 text-ink/80 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{u.nombre}</td>
                    <td className="px-4 py-3">{u.apellidos}</td>
                    <td className="px-4 py-3">{u.correo}</td>
                    <td className="px-4 py-3">{u.sede}</td>
                    <td className="px-4 py-3">{ROL_LABEL[u.rol] ?? u.rol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          u.activo ? 'bg-green-100 text-green-700' : 'bg-black/5 text-ink/50'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/superadmin/usuarios/${u.id}`}
                          aria-label={`Ver detalle de ${u.nombre}`}
                          className="inline-flex items-center gap-1 text-ink/50 hover:text-maroon"
                        >
                          <Eye size={15} /> Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => setUsuarioAConfirmar({ id: u.id, nombre: u.nombre, activo: u.activo })}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'No podés dar de baja tu propia cuenta' : undefined}
                          aria-label={u.activo ? `Dar de baja a ${u.nombre}` : `Reactivar a ${u.nombre}`}
                          className="inline-flex items-center gap-1 text-ink/50 hover:text-maroon disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink/50"
                        >
                          {u.activo ? (
                            <>
                              <UserX size={15} /> Dar de baja
                            </>
                          ) : (
                            <>
                              <UserCheck size={15} /> Reactivar
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink/40">
                      No se encontraron usuarios con ese criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-black/5 px-4 py-3 text-[10px] text-ink/40 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {usuarios.length} de {paginacion.total} usuarios
              {paginacion.total !== stats.totalUsuarios && ` (${stats.totalUsuarios} en total)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginacion.pagina <= 1}
                aria-label="Página anterior"
                className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-ink/60 hover:border-maroon hover:text-maroon disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-black/10 disabled:hover:text-ink/60"
              >
                <ChevronLeft size={12} /> Anterior
              </button>
              <span className="text-ink/60">
                Página {paginacion.pagina} de {paginacion.totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(paginacion.totalPaginas, p + 1))}
                disabled={paginacion.pagina >= paginacion.totalPaginas}
                aria-label="Página siguiente"
                className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-ink/60 hover:border-maroon hover:text-maroon disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-black/10 disabled:hover:text-ink/60"
              >
                Siguiente <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={usuarioAConfirmar !== null}
        titulo={usuarioAConfirmar?.activo ? 'Dar de baja usuario' : 'Reactivar usuario'}
        mensaje={
          usuarioAConfirmar?.activo
            ? `¿Seguro que querés dar de baja a ${usuarioAConfirmar?.nombre}? Va a quedar bloqueado y no podrá iniciar sesión hasta que lo reactives.`
            : `¿Reactivar a ${usuarioAConfirmar?.nombre}? Va a poder volver a iniciar sesión.`
        }
        textoConfirmar={cambiandoEstado ? 'Guardando...' : usuarioAConfirmar?.activo ? 'Dar de baja' : 'Reactivar'}
        onConfirm={confirmarCambioEstado}
        onCancel={() => setUsuarioAConfirmar(null)}
      />
    </main>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <span className="rounded-lg bg-maroon/10 p-2 text-maroon">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">{label}</p>
        <p className="mt-1 text-xl font-bold leading-none text-ink">{value}</p>
      </div>
    </article>
  );
}
