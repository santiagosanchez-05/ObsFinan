import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import { DEFAULT_ROUTE_BY_ROLE } from '../../../shared/navConfig';
import univalleLogo from '../../../assets/univalleLogo.png';

const FORMATO_TEMPORAL_REGEX = /^UVL-[A-Za-z0-9]{6}$/i;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe tener al menos un número')
      .refine((val) => !FORMATO_TEMPORAL_REGEX.test(val), {
        message: 'No puede tener el formato de una contraseña temporal (UVL-XXXXXX)',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export default function CambiarContrasenaObligatoriaPage() {
  const { token, user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), mode: 'onChange' });

  const newPassword = watch('newPassword') || '';
  const reglas = [
    { ok: newPassword.length >= 8, texto: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(newPassword), texto: 'Al menos una mayúscula' },
    { ok: /[0-9]/.test(newPassword), texto: 'Al menos un número' },
  ];

  const onSubmit = async (data) => {
    setErrorServidor('');
    setCargando(true);
    try {
      // Acaba de ingresar con la temporal: el token ya lo prueba, así que no
      // se le vuelve a pedir. El backend devuelve un token nuevo sin la marca.
      const res = await fetch('/api/auth/first-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorServidor(body.error || 'No se pudo actualizar la contraseña');
        return;
      }
      login({ token: body.token, user: { ...user, debeCambiarPassword: false } });
      navigate(DEFAULT_ROUTE_BY_ROLE[user.role] ?? '/', { replace: true });
    } catch {
      setErrorServidor('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-line/70 bg-card shadow-sm">
          <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
            <img src={univalleLogo} alt="Univalle" className="h-12 w-12" />
            <h1 className="mt-3 text-lg font-bold text-ink">Tienes que cambiar tu contraseña</h1>
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert size={14} className="shrink-0" />
              Iniciaste sesión con una contraseña temporal. Elige una nueva antes de seguir.
            </p>
          </div>

          <div className="border-t border-line/70 px-8 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-ink">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    id="newPassword"
                    type={verNueva ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('newPassword')}
                    className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-9 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerNueva((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                    tabIndex={-1}
                  >
                    {verNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPassword && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.newPassword.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-ink">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    id="confirmPassword"
                    type={verConfirmar ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-9 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirmar((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                    tabIndex={-1}
                  >
                    {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="rounded-lg bg-surface p-3">
                {reglas.map((r) => (
                  <div key={r.texto} className="flex items-center gap-2 py-0.5 text-xs">
                    {r.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle size={14} className="text-ink/30" />
                    )}
                    <span className={r.ok ? 'text-ink/70' : 'text-ink/40'}>{r.texto}</span>
                  </div>
                ))}
              </div>

              {errorServidor && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorServidor}</p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
              >
                {cargando ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>

            <button
              type="button"
              onClick={logout}
              className="mt-3 block w-full text-center text-sm font-medium text-ink/50 hover:text-brand"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
