import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, ShieldCheck, UserX, Search, Eye, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../../shared/AuthContext';

// Mismos tokens de marca que el resto de la app (frontend/src/index.css) — a
// mano acá porque los gráficos SVG necesitan el hex, no clases de Tailwind.
const MAROON = '#9E0044';
const MAROON_LIGHT = '#BA254A';

const ROL_LABEL = { superadmin: 'Superadmin', admin: 'Admin', cliente: 'Cliente' };
const COLORES_ROL = [MAROON, MAROON_LIGHT, '#E4A8BB'];

export default function UsuariosPage() {
  const { token } = useAuth();
  const [estado, setEstado] = useState({ cargando: true, datos: null, error: null });
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la información');
        if (!cancelado) setEstado({ cargando: false, datos: data, error: null });
      } catch {
        if (!cancelado) setEstado({ cargando: false, datos: null, error: 'No se pudo cargar la información de usuarios.' });
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  const usuariosFiltrados = useMemo(() => {
    const usuarios = estado.datos?.usuarios ?? [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(termino) ||
        u.apellidos.toLowerCase().includes(termino) ||
        u.sede.toLowerCase().includes(termino),
    );
  }, [estado.datos, busqueda]);

  if (estado.cargando) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-ink/50">Cargando...</main>;
  }

  if (estado.error) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-maroon">{estado.error}</main>;
  }

  const { stats, porSede, porRol } = estado.datos;

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
          <StatCard icon={<UserX size={20} />} label="Cuentas inactivas" value={stats.cuentasInactivas} />
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
                {usuariosFiltrados.map((u) => (
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
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/superadmin/usuarios/${u.id}`}
                        aria-label={`Ver detalle de ${u.nombre}`}
                        className="inline-flex items-center gap-1 text-ink/50 hover:text-maroon"
                      >
                        <Eye size={15} /> Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink/40">
                      No se encontraron usuarios con ese criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-black/5 px-4 py-3 text-[10px] text-ink/40">
            Mostrando {usuariosFiltrados.length} de {stats.totalUsuarios} usuarios
          </div>
        </section>
      </div>
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
