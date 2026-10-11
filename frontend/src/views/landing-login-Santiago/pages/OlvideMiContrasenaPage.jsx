import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ShieldCheck } from 'lucide-react';
import univalleLogo from '../../../assets/univalleLogo.png';

const schema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
});

export default function OlvideMiContrasenaPage() {
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setErrorServidor('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorServidor(body.error || 'No se pudo enviar el correo');
        return;
      }
      // No revelamos si el correo existe o no — siempre avanzamos a la
      // pantalla de código, tal como responde el backend en ambos casos.
      navigate('/verificar-codigo', { state: { email: data.email } });
    } catch {
      setErrorServidor('No se pudo conectar con el servidor. Intentá de nuevo.');
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
            <h2 className="mt-3 text-base font-bold text-ink">Bienestar Financiero</h2>
            <p className="text-sm font-medium text-brand">Universidad del Valle</p>
          </div>

          <div className="border-t border-line/70 px-8 py-6">
            <h1 className="text-lg font-bold text-ink">¿Olvidaste tu contraseña?</h1>
            <p className="mt-1 text-sm text-ink/60">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu
              contraseña
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    id="email"
                    type="email"
                    placeholder="ejemplo@univalle.edu.co"
                    autoComplete="email"
                    {...register('email')}
                    className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
              </div>

              {errorServidor && (
                <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorServidor}</p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
              >
                {cargando ? 'Enviando...' : 'Enviar correo de recuperación'}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-4 block text-center text-sm font-medium text-brand hover:underline"
            >
              Volver
            </Link>

            <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-line/70 pt-4 text-[11px] uppercase tracking-wide text-ink/40">
              <ShieldCheck size={12} />
              Acceso institucional seguro
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink/50">
          ¿Problemas para ingresar? Contacta al administrador de tu sede
        </p>
      </div>
    </div>
  );
}
