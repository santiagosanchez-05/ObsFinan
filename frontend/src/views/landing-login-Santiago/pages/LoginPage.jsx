import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import { DEFAULT_ROUTE_BY_ROLE } from '../../../shared/navConfig';
import univalleLogo from '../../../assets/univalleLogo.png';

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export default function LoginPage() {
  const [errorServidor, setErrorServidor] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setErrorServidor('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();

      if (!res.ok) {
        setErrorServidor(body.error || 'No se pudo iniciar sesión');
        return;
      }

      login(body); // { token, user }
      navigate(DEFAULT_ROUTE_BY_ROLE[body.user.role] ?? '/');
    } catch {
      setErrorServidor('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line/70 bg-card p-8 shadow-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-ink/50 hover:text-brand"
        >
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>

        <div className="mt-4 flex flex-col items-center text-center">
          <img src={univalleLogo} alt="Univalle" className="h-12 w-12" />
          <h1 className="mt-4 text-xl font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-ink/60">Bienestar Financiero Univalle</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
          </div>

          <div className="text-right">
            <Link to="/olvide-mi-contrasena" className="text-xs text-brand hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {errorServidor && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorServidor}</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
