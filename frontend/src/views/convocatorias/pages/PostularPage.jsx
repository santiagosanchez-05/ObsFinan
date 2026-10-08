import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

function formatearFecha(iso) {
  if (!iso) return '-';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PostularPage() {
  const { token } = useAuth();

  const [convocatorias, setConvocatorias] = useState([]);
  const [cargandoConvocatorias, setCargandoConvocatorias] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState('');
  const [formulario, setFormulario] = useState({
    first_name: '',
    paternal_last_name: '',
    maternal_last_name: '',
    email: '',
    phone: '',
  });

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [postulacionExitosa, setPostulacionExitosa] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarAbiertas() {
      try {
        setCargandoConvocatorias(true);
        setErrorCarga(null);

        const res = await fetch('/api/convocatorias/abiertas', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('No se pudieron obtener las convocatorias vigentes.');
        }

        const data = await res.json();
        if (activo) {
          const lista = Array.isArray(data) ? data : [];
          setConvocatorias(lista);
          if (lista.length > 0) {
            setConvocatoriaSeleccionada(String(lista[0].id));
          }
        }
      } catch (err) {
        if (activo) {
          setErrorCarga(err.message || 'Error al cargar convocatorias.');
        }
      } finally {
        if (activo) {
          setCargandoConvocatorias(false);
        }
      }
    }

    cargarAbiertas();
    return () => {
      activo = false;
    };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!convocatoriaSeleccionada) {
      setErrorEnvio('Debes seleccionar una convocatoria para postularte.');
      return;
    }

    try {
      setEnviando(true);
      setErrorEnvio(null);

      const res = await fetch(`/api/convocatorias/${convocatoriaSeleccionada}/postulaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formulario),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.error || 'Error al enviar la postulación.');
      }

      setPostulacionExitosa({
        applicantId: resData.applicantId,
        convocatoria: convocatorias.find((c) => String(c.id) === String(convocatoriaSeleccionada)),
      });
    } catch (err) {
      console.error('Error al postular:', err);
      setErrorEnvio(err.message || 'Error inesperado al enviar postulación.');
    } finally {
      setEnviando(false);
    }
  };

  const handleNuevaPostulacion = () => {
    setPostulacionExitosa(null);
    setFormulario({
      first_name: '',
      paternal_last_name: '',
      maternal_last_name: '',
      email: '',
      phone: '',
    });
  };

  if (cargandoConvocatorias) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-20 text-ink/60">
          <Loader2 className="h-8 w-8 animate-spin text-maroon" />
          <p className="mt-3 text-xs font-medium">Buscando convocatorias abiertas...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Cabecera pública */}
        <div className="text-center space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
            Convocatoria Abierta
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[30px]">
            Postulación para Encuestadores
          </h1>
          <p className="text-xs text-ink/65 max-w-md mx-auto">
            Forma parte del equipo de relevamiento del Observatorio de Bienestar Financiero Univalle
          </p>
        </div>

        {errorCarga && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <span>{errorCarga}</span>
          </div>
        )}

        {/* Pantalla de éxito */}
        {postulacionExitosa ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-xs space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-ink">¡Postulación recibida con éxito!</h2>
              <p className="text-xs text-ink/60">
                Hemos registrado tus datos para la convocatoria{' '}
                <strong className="text-ink font-semibold">
                  {postulacionExitosa.convocatoria?.titulo || ''}
                </strong>
                .
              </p>
              {postulacionExitosa.applicantId && (
                <p className="text-[11px] font-mono text-ink/50 pt-1">
                  Identificador de registro: #{postulacionExitosa.applicantId}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-ink/5 bg-surface p-4 text-xs text-ink/70 text-left space-y-1">
              <p className="font-semibold text-ink">¿Cuáles son los siguientes pasos?</p>
              <p>
                El equipo de coordinación revisará tu solicitud y te contactará por correo
                electrónico ({formulario.email}) con las instrucciones correspondientes.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleNuevaPostulacion}
                className="rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface transition-colors"
              >
                Enviar otra postulación
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-maroon px-4 py-2.5 text-xs font-semibold text-white hover:bg-maroon-light transition-colors"
              >
                <span>Volver al inicio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : convocatorias.length === 0 ? (
          /* Estado sin convocatorias abiertas */
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center shadow-xs space-y-3">
            <HelpCircle className="mx-auto h-10 w-10 text-ink/30" />
            <h3 className="text-sm font-semibold text-ink">No hay convocatorias vigentes</h3>
            <p className="text-xs text-ink/50 max-w-sm mx-auto">
              Actualmente no existen convocatorias abiertas para encuestadores. Por favor, vuelve a
              consultar más adelante o contáctate con la administración de tu sede.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center rounded-xl bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          /* Formulario de postulación */
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-ink/10 bg-white p-6 shadow-xs sm:p-8 space-y-5"
          >
            {errorEnvio && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorEnvio}</span>
              </div>
            )}

            {/* Selector de convocatoria */}
            <div className="space-y-1.5">
              <label htmlFor="convocatoria" className="block text-xs font-bold text-ink">
                Convocatoria a la que postulas *
              </label>
              <select
                id="convocatoria"
                value={convocatoriaSeleccionada}
                onChange={(e) => setConvocatoriaSeleccionada(e.target.value)}
                className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-xs font-medium text-ink focus:border-maroon focus:outline-hidden"
                required
              >
                {convocatorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo} — Sede {c.sede} (Vigente hasta {formatearFecha(c.fechaFin)})
                  </option>
                ))}
              </select>
            </div>

            {/* Datos Personales */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="block text-xs font-bold text-ink">
                  Nombres *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formulario.first_name}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos"
                  required
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs text-ink placeholder:text-ink/35 focus:border-maroon focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="paternal_last_name" className="block text-xs font-bold text-ink">
                  Apellido Paterno *
                </label>
                <input
                  type="text"
                  id="paternal_last_name"
                  name="paternal_last_name"
                  value={formulario.paternal_last_name}
                  onChange={handleChange}
                  placeholder="Ej. Pérez"
                  required
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs text-ink placeholder:text-ink/35 focus:border-maroon focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="maternal_last_name" className="block text-xs font-bold text-ink">
                  Apellido Materno (opcional)
                </label>
                <input
                  type="text"
                  id="maternal_last_name"
                  name="maternal_last_name"
                  value={formulario.maternal_last_name}
                  onChange={handleChange}
                  placeholder="Ej. Gómez"
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs text-ink placeholder:text-ink/35 focus:border-maroon focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-bold text-ink">
                  Teléfono / Celular *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formulario.phone}
                  onChange={handleChange}
                  placeholder="Ej. 76543210"
                  required
                  className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs text-ink placeholder:text-ink/35 focus:border-maroon focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-ink">
                Correo Electrónico *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formulario.email}
                onChange={handleChange}
                placeholder="Ej. juan.perez@estudiante.univalle.edu"
                required
                className="w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2 text-xs text-ink placeholder:text-ink/35 focus:border-maroon focus:outline-hidden"
              />
              <p className="text-[11px] text-ink/50">
                Asegúrate de escribir un correo al que tengas acceso frecuente.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon py-3 text-xs font-semibold text-white shadow-xs hover:bg-maroon-light transition-colors disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando postulación...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Enviar mi postulación</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
