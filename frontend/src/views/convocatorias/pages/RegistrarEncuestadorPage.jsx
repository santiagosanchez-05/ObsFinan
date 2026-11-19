import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Camera, CheckCircle2, Info } from 'lucide-react';
import { useAuth, ROLES } from '../../../shared/AuthContext';
import { campoNombre, campoNombreOpcional, campoCorreo } from '../../../shared/validaciones';

const CAMPO = 'w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none';

function crearSchema(esSuperadmin) {
  return z
    .object({
      nombre: campoNombre('El nombre'),
      apellidoPaterno: campoNombre('El apellido paterno'),
      apellidoMaterno: campoNombreOpcional('El apellido materno'),
      correo: campoCorreo(),
      campusId: z.string(),
    })
    .superRefine((datos, ctx) => {
      if (esSuperadmin && !datos.campusId) {
        ctx.addIssue({ code: 'custom', path: ['campusId'], message: 'Selecciona la sede' });
      }
    });
}

// Kevin Alanes — US54. Registro directo de un encuestador (sin convocatoria).
// El Admin lo registra en su sede; el Superadmin elige la sede.
export default function RegistrarEncuestadorPage() {
  const { token, user } = useAuth();
  const esSuperadmin = user?.role === ROLES.SUPERADMIN;
  const fileInputRef = useRef(null);
  const [sedes, setSedes] = useState([]);
  const [foto, setFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(crearSchema(esSuperadmin)),
    defaultValues: { nombre: '', apellidoPaterno: '', apellidoMaterno: '', correo: '', campusId: '' },
  });

  useEffect(() => {
    if (!esSuperadmin) return;
    fetch('/api/users/campuses', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSedes(Array.isArray(data) ? data : []))
      .catch(() => setSedes([]));
  }, [esSuperadmin, token]);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  function cambiarFoto(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setFoto(archivo);
    setPreviewUrl(URL.createObjectURL(archivo));
  }

  async function onSubmit(datos) {
    setErrorServidor('');
    setEnviando(true);
    const formData = new FormData();
    Object.entries(datos).forEach(([clave, valor]) => {
      if (clave === 'campusId' && !esSuperadmin) return; // el backend usa la sede del Admin
      formData.append(clave, valor ?? '');
    });
    if (foto) formData.append('foto', foto);

    try {
      const res = await fetch('/api/users/encuestadores', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar al encuestador');
      setResultado(data);
    } catch (err) {
      setErrorServidor(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function registrarOtro() {
    reset();
    setFoto(null);
    setPreviewUrl(null);
    setResultado(null);
  }

  if (resultado) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-green-600 dark:text-green-400" />
          <h1 className="mt-3 text-xl font-bold text-ink">Encuestador registrado</h1>
          {resultado.correoEnviado ? (
            <p className="mt-2 text-sm text-ink/60">Le enviamos un correo con su contraseña temporal. Al ingresar por primera vez deberá cambiarla.</p>
          ) : (
            <div className="mt-3 rounded-lg bg-surface p-3 text-sm text-ink/70">
              <p>No se pudo enviar el correo. Compártele esta contraseña temporal de forma privada:</p>
              <p className="mt-2 font-mono text-lg font-bold text-brand">{resultado.passwordTemporal}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/eventos" className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface">
              Ir a eventos
            </Link>
            <button
              type="button"
              onClick={registrarOtro}
              className="rounded-lg bg-maroon px-5 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light"
            >
              Registrar otro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/convocatorias" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          <ArrowLeft size={14} /> Volver a convocatorias
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Registrar encuestador</h1>
        <p className="mt-1 text-sm text-ink/60">Crea la cuenta de un encuestador sin que pase por una convocatoria.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center border-b border-line/70 pb-6 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Elegir foto"
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface text-ink/30 ring-1 ring-line hover:text-brand"
            >
              {previewUrl ? <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" /> : <Camera size={22} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={cambiarFoto} className="hidden" />
            <p className="mt-2 text-[11px] text-ink/40">Foto opcional. JPG o PNG, máx. 5MB.</p>
          </div>

          <div className="mt-6 space-y-4">
            <Campo id="enc-nombre" label="Nombres" error={errors.nombre?.message}>
              <input id="enc-nombre" {...register('nombre')} placeholder="Ej. Ana María" className={CAMPO} />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="enc-paterno" label="Apellido paterno" error={errors.apellidoPaterno?.message}>
                <input id="enc-paterno" {...register('apellidoPaterno')} placeholder="Ej. Pérez" className={CAMPO} />
              </Campo>
              <Campo id="enc-materno" label="Apellido materno (opcional)">
                <input id="enc-materno" {...register('apellidoMaterno')} placeholder="Ej. García" className={CAMPO} />
              </Campo>
            </div>
            <Campo id="enc-correo" label="Correo electrónico" error={errors.correo?.message}>
              <input id="enc-correo" type="email" {...register('correo')} placeholder="usuario@correo.com" className={CAMPO} />
            </Campo>
            {esSuperadmin ? (
              <Campo id="enc-sede" label="Sede" error={errors.campusId?.message}>
                <select id="enc-sede" {...register('campusId')} className={CAMPO}>
                  <option value="">Selecciona la sede</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </Campo>
            ) : (
              <div className="rounded-lg bg-surface px-3 py-2 text-sm text-ink/70">
                Sede: <strong className="text-ink">{user?.sede || 'tu sede'}</strong>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-300">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>Se le enviará un correo con una contraseña temporal. En su primer ingreso el sistema le pedirá cambiarla.</p>
          </div>

          {errorServidor && <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorServidor}</p>}

          <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={enviando} className="rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60">
              {enviando ? 'Registrando...' : 'Registrar encuestador'}
            </button>
            <Link to="/convocatorias" className="text-sm font-medium text-ink/50 hover:text-ink">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Campo({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
