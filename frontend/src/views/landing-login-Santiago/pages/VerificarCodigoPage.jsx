import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import univalleLogo from '../../../assets/univalleLogo.png';

const REENVIAR_ESPERA_SEGUNDOS = 30;

export default function VerificarCodigoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [digitos, setDigitos] = useState(Array(6).fill(''));
  const [segundosRestantes, setSegundosRestantes] = useState(REENVIAR_ESPERA_SEGUNDOS);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const inputsRef = useRef([]);

  // Si alguien llega directo a esta URL sin haber pasado por "Olvidé mi
  // contraseña" (sin email en el state), lo mandamos de vuelta.
  useEffect(() => {
    if (!email) navigate('/olvide-mi-contrasena', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const id = setInterval(() => setSegundosRestantes((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [segundosRestantes]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // solo un dígito o vacío
    const nuevos = [...digitos];
    nuevos[index] = value;
    setDigitos(nuevos);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const codigo = digitos.join('');

  const verificar = async () => {
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codigo }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo verificar el código');
        return;
      }
      navigate('/nueva-contrasena', { state: { resetToken: body.resetToken } });
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    if (segundosRestantes > 0) return;
    setError('');
    setDigitos(Array(6).fill(''));
    inputsRef.current[0]?.focus();
    setSegundosRestantes(REENVIAR_ESPERA_SEGUNDOS);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Si falla el reenvío, el usuario igual puede intentar de nuevo cuando termine el conteo.
    }
  };

  const formatoTiempo = `00:${String(segundosRestantes).padStart(2, '0')}`;

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
            <h1 className="text-lg font-bold text-ink">Ingresa tu código de recuperación</h1>
            <p className="mt-1 text-sm text-ink/60">
              Enviamos un código de verificación a tu correo electrónico. Ingrésalo a
              continuación para continuar
            </p>

            <div className="mt-5 flex justify-between gap-2">
              {digitos.map((valor, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  value={valor}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  className="h-12 w-11 rounded-lg border border-line bg-surface text-center text-lg font-semibold text-ink focus:border-brand focus:outline-none"
                />
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-ink/50">
              ¿No recibiste el código?{' '}
              {segundosRestantes > 0 ? (
                <span className="font-medium text-brand">Reenviar en {formatoTiempo}</span>
              ) : (
                <button onClick={reenviar} className="font-medium text-brand hover:underline">
                  Reenviar
                </button>
              )}
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-center text-sm text-red-700 dark:text-red-300">{error}</p>
            )}

            <button
              onClick={verificar}
              disabled={codigo.length !== 6 || cargando}
              className="mt-4 w-full rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
            >
              {cargando ? 'Verificando...' : 'Verificar código'}
            </button>

            <Link
              to="/login"
              className="mt-3 block text-center text-sm font-medium text-brand hover:underline"
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
