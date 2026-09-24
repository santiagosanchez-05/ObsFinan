import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

const ROL_LABEL = { superadmin: 'Superadmin', admin: 'Admin', encuestador: 'Encuestador' };

// DD/MM/AAAA — mismo formato que la maqueta.
function formatearFecha(fechaISO) {
  if (!fechaISO) return '—';
  return new Date(fechaISO).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UsuarioDetallePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [estado, setEstado] = useState({ cargando: true, usuario: null, error: null });
  const [fotoUrl, setFotoUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setEstado({ cargando: true, usuario: null, error: null });
      try {
        const res = await fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el usuario');
        if (!cancelado) setEstado({ cargando: false, usuario: data, error: null });
      } catch (err) {
        if (!cancelado) setEstado({ cargando: false, usuario: null, error: err.message });
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [id, token]);

  // La foto va en un endpoint aparte (es un BLOB, no cabe en el JSON del
  // detalle) y encima está protegida — un <img src="..."> normal no puede
  // mandar el header Authorization, así que la traemos con fetch y armamos
  // una URL local a partir del blob.
  useEffect(() => {
    if (!estado.usuario?.tieneFoto) {
      setFotoUrl(null);
      return;
    }

    let cancelado = false;
    let urlCreada = null;

    fetch(`/api/users/${id}/photo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelado) return;
        urlCreada = URL.createObjectURL(blob);
        setFotoUrl(urlCreada);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [id, token, estado.usuario?.tieneFoto]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/superadmin/usuarios" className="inline-flex items-center gap-1 text-xs font-medium text-maroon hover:underline">
          <ArrowLeft size={14} /> Volver a Usuarios
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Detalle de usuario</h1>

        {estado.cargando && <p className="mt-6 text-sm text-ink/50">Cargando...</p>}
        {estado.error && <p className="mt-6 text-sm text-maroon">{estado.error}</p>}

        {estado.usuario && (
          <div className="mt-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
            {/* Encabezado centrado: avatar + nombre + badges */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-maroon/10 text-2xl font-bold text-maroon">
                {fotoUrl ? (
                  <img src={fotoUrl} alt={`Foto de ${estado.usuario.nombre}`} className="h-full w-full object-cover" />
                ) : (
                  <>
                    {estado.usuario.nombre.charAt(0)}
                    {(estado.usuario.apellidoPaterno ?? '').charAt(0)}
                  </>
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold text-ink">
                {estado.usuario.nombre} {estado.usuario.apellidos}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-maroon/10 px-3 py-1 text-[11px] font-semibold text-maroon">
                  {ROL_LABEL[estado.usuario.rol] ?? estado.usuario.rol}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    estado.usuario.activo ? 'bg-green-100 text-green-700' : 'bg-black/5 text-ink/50'
                  }`}
                >
                  {estado.usuario.activo ? 'Activo' : 'Bloqueado'}
                </span>
              </div>
            </div>

            {/* Dos columnas: información personal / información de la cuenta */}
            <div className="mt-8 grid gap-8 border-t border-black/5 pt-6 sm:grid-cols-2">
              <div>
                <h3 className="border-b border-black/5 pb-2 text-sm font-bold text-ink">Información personal</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Dato label="Nombres" valor={estado.usuario.nombre} />
                  <div />
                  <Dato label="Apellido paterno" valor={estado.usuario.apellidoPaterno || '—'} />
                  <Dato label="Apellido materno" valor={estado.usuario.apellidoMaterno || '—'} />
                </div>
                <div className="mt-4">
                  <Dato icon={<Mail size={13} />} label="Correo electrónico" valor={estado.usuario.correo} />
                </div>
              </div>

              <div>
                <h3 className="border-b border-black/5 pb-2 text-sm font-bold text-ink">Información de la cuenta</h3>
                <div className="mt-4 space-y-4">
                  <Dato label="Rol" valor={ROL_LABEL[estado.usuario.rol] ?? estado.usuario.rol} />
                  <Dato label="Sede" valor={estado.usuario.sede} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Estado</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                      <span className={`h-2 w-2 rounded-full ${estado.usuario.activo ? 'bg-green-500' : 'bg-ink/30'}`} />
                      {estado.usuario.activo ? 'Activo' : 'Bloqueado'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-surface p-3 text-xs text-ink/60">
                    <p className="flex items-center gap-1.5">
                      <Calendar size={13} /> Creado el <span className="font-semibold text-ink">{formatearFecha(estado.usuario.fechaRegistro)}</span>
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5">
                      <Clock size={13} /> Última edición el{' '}
                      <span className="font-semibold text-ink">{formatearFecha(estado.usuario.fechaActualizacion)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center border-t border-black/5 pt-6">
              <Link
                to={`/superadmin/usuarios/${estado.usuario.id}/editar`}
                className="rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light"
              >
                Editar usuario
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Dato({ icon, label, valor }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink/50">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm text-ink">{valor}</p>
    </div>
  );
}
