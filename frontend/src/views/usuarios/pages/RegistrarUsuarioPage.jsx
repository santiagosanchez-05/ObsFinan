import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Camera, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

const registrarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().trim().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().trim().optional(),
  correo: z.string().trim().min(1, 'El correo es obligatorio').email('Correo inválido'),
  rol: z.string().min(1, 'Seleccioná un rol'),
  campusId: z.string().min(1, 'Seleccioná una sede'),
});

export default function RegistrarUsuarioPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [campuses, setCampuses] = useState([]);
  const [foto, setFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registrarUsuarioSchema) });

  useEffect(() => {
    fetch('/api/users/campuses', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setCampuses(Array.isArray(data) ? data : []))
      .catch(() => setCampuses([]));
  }, [token]);

  function handleFotoChange(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setFoto(archivo);
    setPreviewUrl(URL.createObjectURL(archivo));
  }

  async function onSubmit(datos) {
    setErrorServidor('');
    setEnviando(true);

    const formData = new FormData();
    Object.entries(datos).forEach(([key, value]) => formData.append(key, value ?? ''));
    if (foto) formData.append('foto', foto);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorServidor(data.error || 'No se pudo registrar el usuario');
        return;
      }
      setResultado(data);
    } catch {
      setErrorServidor('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-green-600" />
          <h1 className="mt-3 text-xl font-bold text-ink">Usuario registrado correctamente</h1>
          {resultado.correoEnviado ? (
            <p className="mt-2 text-sm text-ink/60">Le enviamos un correo con su contraseña temporal.</p>
          ) : (
            <div className="mt-3 rounded-lg bg-surface p-3 text-sm text-ink/70">
              <p>No se pudo enviar el correo — compartile esta contraseña temporal a mano:</p>
              <p className="mt-2 font-mono text-lg font-bold text-maroon">{resultado.passwordTemporal}</p>
            </div>
          )}
          <button
            onClick={() => navigate('/superadmin/usuarios')}
            className="mt-6 rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light"
          >
            Volver al listado
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/superadmin/usuarios" className="inline-flex items-center gap-1 text-xs font-medium text-maroon hover:underline">
          <ArrowLeft size={14} /> Volver a Usuarios
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Registrar nuevo usuario</h1>
        <p className="mt-1 text-sm text-ink/60">Completa los datos para crear una cuenta de Superadmin, Admin o Encuestador</p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col items-center border-b border-black/5 pb-6 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface text-ink/30 ring-1 ring-black/10 hover:text-maroon"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
              ) : (
                <Camera size={22} />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleFotoChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-semibold text-maroon">
              Subir foto
            </button>
            <p className="mt-1 text-[11px] text-ink/40">Formatos sugeridos: JPG o PNG. Máx 5MB.</p>
          </div>

          <div className="mt-6 space-y-4">
            <Campo label="Nombres" error={errors.nombre?.message}>
              <input {...register('nombre')} placeholder="Ej. Juan Ignacio" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none" />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Apellido paterno" error={errors.apellidoPaterno?.message}>
                <input {...register('apellidoPaterno')} placeholder="Ej. Pérez" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none" />
              </Campo>
              <Campo label="Apellido materno">
                <input {...register('apellidoMaterno')} placeholder="Ej. García" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none" />
              </Campo>
            </div>

            <Campo label="Correo electrónico" error={errors.correo?.message}>
              <input {...register('correo')} type="email" placeholder="usuario@univalle.edu" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none" />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Rol" error={errors.rol?.message}>
                <select {...register('rol')} defaultValue="" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none">
                  <option value="" disabled>
                    Asignar rol
                  </option>
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="encuestador">Encuestador</option>
                </select>
              </Campo>
              <Campo label="Sede" error={errors.campusId?.message}>
                <select {...register('campusId')} defaultValue="" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none">
                  <option value="" disabled>
                    Selecciona sede
                  </option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>Se enviará un correo al usuario con instrucciones para crear su contraseña una vez completado el registro.</p>
          </div>

          {errorServidor && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorServidor}</p>}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
            >
              {enviando ? 'Registrando...' : 'Registrar usuario'}
            </button>
            <Link to="/superadmin/usuarios" className="text-sm font-medium text-ink/50 hover:text-ink">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Campo({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
