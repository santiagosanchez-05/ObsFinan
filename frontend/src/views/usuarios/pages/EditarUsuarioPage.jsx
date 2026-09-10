import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, KeyRound } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';

function formatearFecha(fechaISO) {
  if (!fechaISO) return '—';
  return new Date(fechaISO).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' - ' +
    new Date(fechaISO).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export default function EditarUsuarioPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [estado, setEstado] = useState({ cargando: true, usuario: null, error: null });
  const [rol, setRol] = useState('');
  const [campusId, setCampusId] = useState('');
  const [activo, setActivo] = useState(true);
  const [campuses, setCampuses] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');

  const [confirmarReset, setConfirmarReset] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [resultadoReset, setResultadoReset] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const [resUsuario, resCampuses] = await Promise.all([
          fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/users/campuses', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const usuario = await resUsuario.json();
        if (!resUsuario.ok) throw new Error(usuario.error || 'No se pudo cargar el usuario');
        const campusesData = await resCampuses.json();

        if (cancelado) return;
        setEstado({ cargando: false, usuario, error: null });
        setRol(usuario.rol);
        setCampusId(String(usuario.campusId));
        setActivo(usuario.activo);
        setCampuses(Array.isArray(campusesData) ? campusesData : []);
      } catch (err) {
        if (!cancelado) setEstado({ cargando: false, usuario: null, error: err.message });
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [id, token]);

  async function handleGuardar(e) {
    e.preventDefault();
    setErrorGuardado('');
    setGuardando(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol, campusId: Number(campusId), activo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorGuardado(data.error || 'No se pudo guardar los cambios');
        return;
      }
      navigate(`/superadmin/usuarios/${id}`);
    } catch {
      setErrorGuardado('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  async function handleResetearPassword() {
    setConfirmarReset(false);
    setReseteando(true);
    setResultadoReset(null);
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setResultadoReset({ error: data.error || 'No se pudo resetear la contraseña' });
        return;
      }
      setResultadoReset(data);
    } catch {
      setResultadoReset({ error: 'No se pudo conectar con el servidor.' });
    } finally {
      setReseteando(false);
    }
  }

  if (estado.cargando) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-ink/50">Cargando...</main>;
  }
  if (estado.error) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-maroon">{estado.error}</main>;
  }

  const { usuario } = estado;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to={`/superadmin/usuarios/${id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-maroon hover:underline"
        >
          <ArrowLeft size={14} /> Volver
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Editar usuario</h1>

        {/* Ficha de solo lectura del usuario */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-maroon/10 text-sm font-bold text-maroon">
            {usuario.nombre.charAt(0)}
            {(usuario.apellidoPaterno ?? '').charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {usuario.nombre} {usuario.apellidos}
            </p>
            <p className="text-xs text-ink/50">{usuario.correo}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
            Lectura solamente
          </span>
        </div>

        <form onSubmit={handleGuardar} className="mt-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>Solo podés modificar el rol, la sede y el estado de la cuenta. Los datos personales los administra el propio usuario desde su perfil.</p>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">Rol del usuario</span>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              >
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="cliente">Cliente</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">Sede asignada</span>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-3">
              <div>
                <p className="text-xs font-semibold text-ink">Estado de cuenta</p>
                <p className="text-[11px] text-ink/50">{activo ? 'Activo' : 'Bloqueado'}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activo}
                onClick={() => setActivo((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${activo ? 'bg-maroon' : 'bg-black/20'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    activo ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {errorGuardado && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorGuardado}</p>}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link to={`/superadmin/usuarios/${id}`} className="text-sm font-medium text-ink/50 hover:text-ink">
              Cancelar
            </Link>
          </div>
        </form>

        {/* Resetear contraseña — acción independiente, no forma parte de "Guardar cambios" */}
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-sm font-bold text-ink">Resetear contraseña</h2>
          <p className="mt-1 text-xs text-ink/60">
            Genera una contraseña temporal nueva y se la envía a {usuario.correo} por correo.
          </p>

          {resultadoReset?.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resultadoReset.error}</p>}
          {resultadoReset && !resultadoReset.error && (
            <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              {resultadoReset.correoEnviado ? (
                <p>Se le envió un correo con la contraseña temporal.</p>
              ) : (
                <>
                  <p>No se pudo enviar el correo — compartile esta contraseña a mano:</p>
                  <p className="mt-1 font-mono text-base font-bold text-maroon">{resultadoReset.passwordTemporal}</p>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setConfirmarReset(true)}
            disabled={reseteando}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-maroon px-4 py-2 text-sm font-semibold text-maroon hover:bg-maroon/5 disabled:opacity-60"
          >
            <KeyRound size={15} /> {reseteando ? 'Reseteando...' : 'Resetear contraseña'}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink/40">
          Última modificación realizada por {usuario.modificadoPor ?? usuario.nombre} el {formatearFecha(usuario.fechaActualizacion ?? usuario.fechaRegistro)}
        </p>
      </div>

      <ConfirmDialog
        open={confirmarReset}
        titulo="Resetear contraseña"
        mensaje={`¿Seguro que querés generar una contraseña temporal nueva para ${usuario.nombre}? La contraseña actual dejará de funcionar.`}
        textoConfirmar="Sí, resetear"
        onConfirm={handleResetearPassword}
        onCancel={() => setConfirmarReset(false)}
      />
    </main>
  );
}
