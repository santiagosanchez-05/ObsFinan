import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { useAuth, ROLES } from '../../../shared/AuthContext';

const CAMPO = 'w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none';

// Fecha de hoy en Bolivia (AAAA-MM-DD), para el valor por defecto del inicio.
const hoy = () => new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);

function crearSchema(esSuperadmin) {
  return z
    .object({
      title: z.string().trim().min(1, 'El título es obligatorio').max(150, 'Máximo 150 caracteres'),
      start_date: z.string().min(1, 'Indica la fecha de inicio'),
      end_date: z.string().min(1, 'Indica la fecha de cierre'),
      description: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
      campus_id: z.string(),
    })
    .superRefine((datos, ctx) => {
      if (esSuperadmin && !datos.campus_id) {
        ctx.addIssue({ code: 'custom', path: ['campus_id'], message: 'Selecciona la sede' });
      }
      if (datos.start_date && datos.end_date && datos.end_date < datos.start_date) {
        ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'El cierre no puede ser antes del inicio' });
      }
    });
}

// Kevin Alanes — US50. El Admin abre convocatorias de su sede; el Superadmin elige la sede.
export default function NuevaConvocatoriaPage() {
  const { token, user } = useAuth();
  const esSuperadmin = user?.role === ROLES.SUPERADMIN;
  const [sedes, setSedes] = useState([]);
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(crearSchema(esSuperadmin)),
    defaultValues: { title: '', start_date: hoy(), end_date: '', description: '', campus_id: '' },
  });

  useEffect(() => {
    if (!esSuperadmin) return;
    fetch('/api/users/campuses', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSedes(Array.isArray(data) ? data : []))
      .catch(() => setSedes([]));
  }, [esSuperadmin, token]);

  async function onSubmit(datos) {
    setErrorServidor('');
    setEnviando(true);
    try {
      const res = await fetch('/api/convocatorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...datos,
          // El Admin siempre en su sede (el backend lo vuelve a controlar).
          campus_id: esSuperadmin ? Number(datos.campus_id) : user?.campusId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la convocatoria');
      setCreada({ ...data, titulo: datos.title });
    } catch (err) {
      setErrorServidor(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (creada) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-green-600 dark:text-green-400" />
          <h1 className="mt-3 text-xl font-bold text-ink">Convocatoria creada</h1>
          <p className="mt-2 text-sm text-ink/60">
            “{creada.titulo}” ya aparece en el formulario público de postulación mientras esté vigente.
          </p>
          <Link to="/convocatorias" className="mt-6 inline-flex rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light">
            Volver a convocatorias
          </Link>
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Nueva convocatoria</h1>
        <p className="mt-1 text-sm text-ink/60">Abre una convocatoria para que las personas se postulen como encuestadores.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4 rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <Campo id="conv-titulo" label="Título" error={errors.title?.message}>
            <input id="conv-titulo" {...register('title')} placeholder="Ej. Convocatoria de encuestadores 2026-II" className={CAMPO} />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="conv-inicio" label="Fecha de inicio" error={errors.start_date?.message}>
              <input id="conv-inicio" type="date" {...register('start_date')} className={CAMPO} />
            </Campo>
            <Campo id="conv-cierre" label="Fecha de cierre" error={errors.end_date?.message}>
              <input id="conv-cierre" type="date" {...register('end_date')} className={CAMPO} />
            </Campo>
          </div>

          {esSuperadmin ? (
            <Campo id="conv-sede" label="Sede" error={errors.campus_id?.message}>
              <select id="conv-sede" {...register('campus_id')} className={CAMPO}>
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

          <Campo id="conv-descripcion" label="Descripción (opcional)" error={errors.description?.message}>
            <textarea id="conv-descripcion" rows={4} {...register('description')} placeholder="Requisitos, horarios, a quién está dirigida..." className={CAMPO} />
          </Campo>

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-300">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>Las postulaciones se revisan en “Postulantes”. Al aceptar a alguien se le crea su cuenta de encuestador en esta sede.</p>
          </div>

          {errorServidor && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errorServidor}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={enviando} className="rounded-lg bg-maroon px-6 py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60">
              {enviando ? 'Creando...' : 'Crear convocatoria'}
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
