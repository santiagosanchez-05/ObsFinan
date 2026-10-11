import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, X } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import apiFetch from '../../../shared/apiFetch';
import { MODALIDADES, headersDe, hoyIso } from '../eventosUtils';

const CAMPO = 'w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none';
const MAX_IMAGEN = 5 * 1024 * 1024;

// Mismas reglas que el backend (events.validation.js). La fecha: al crear,
// hoy o futura; al editar, puede quedar la que ya tenía aunque haya pasado.
function crearSchema({ esSuperadmin, fechaOriginal }) {
  return z
    .object({
      titulo: z.string().trim().min(1, 'El título es obligatorio').max(150, 'Máximo 150 caracteres'),
      fecha: z.string().min(1, 'La fecha es obligatoria'),
      hora: z.string().min(1, 'La hora es obligatoria'),
      modalidad: z.string().min(1, 'Selecciona la modalidad'),
      lugar: z.string().trim().min(1, 'El lugar es obligatorio').max(255, 'Máximo 255 caracteres'),
      cupos: z
        .string()
        .trim()
        .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Ingresa un número entero mayor a 0'),
      enlaceExterno: z
        .string()
        .trim()
        .max(255, 'Máximo 255 caracteres')
        .refine((v) => v === '' || /^https?:\/\/\S+\.\S+/i.test(v), 'El enlace debe empezar con http:// o https://'),
      descripcion: z.string().max(5000, 'Máximo 5000 caracteres'),
      hasIca: z.boolean(),
      // Solo el Superadmin la registra; para el Admin se manda el valor que ya tenía.
      hasSpe: z.boolean().optional(),
      campusId: z.string(),
    })
    .superRefine((datos, ctx) => {
      if (datos.fecha && datos.fecha !== fechaOriginal && datos.fecha < hoyIso()) {
        ctx.addIssue({ code: 'custom', path: ['fecha'], message: 'La fecha no puede ser anterior a hoy' });
      }
      if (esSuperadmin && !datos.campusId) {
        ctx.addIssue({ code: 'custom', path: ['campusId'], message: 'Selecciona la sede' });
      }
    });
}

/**
 * Formulario de registro y edición de eventos (US44 / US45).
 * - `evento`: null para registrar, o el evento actual para editar.
 * - `onGuardado(eventId)`: se llama cuando el backend confirma.
 */
export default function EventoForm({ evento = null, onGuardado }) {
  const { token, user } = useAuth();
  const esSuperadmin = user?.role === 'superadmin';
  const editando = Boolean(evento);
  const inputImagen = useRef(null);

  const [sedes, setSedes] = useState([]);
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(evento?.imagenUrl ?? null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const schema = useMemo(() => crearSchema({ esSuperadmin, fechaOriginal: evento?.fecha }), [esSuperadmin, evento?.fecha]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: evento?.titulo ?? '',
      fecha: evento?.fecha ?? '',
      hora: evento?.hora ?? '',
      modalidad: evento ? String(evento.modalidad) : '',
      lugar: evento?.lugar ?? '',
      cupos: evento?.cupos ? String(evento.cupos) : '',
      enlaceExterno: evento?.enlaceExterno ?? '',
      descripcion: evento?.descripcion ?? '',
      hasIca: evento?.hasIca ?? false,
      hasSpe: evento?.hasSpe ?? false,
      campusId: evento ? String(evento.campusId) : '',
    },
  });

  // Solo el Superadmin elige sede: el Admin registra siempre en la suya.
  useEffect(() => {
    if (!esSuperadmin) return;
    fetch('/api/users/campuses', { headers: headersDe(token) })
      .then((res) => res.json())
      .then((data) => setSedes(Array.isArray(data) ? data : []))
      .catch(() => setSedes([]));
  }, [esSuperadmin, token]);

  // Libera la URL temporal de la vista previa al cambiarla o salir.
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function elegirImagen(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      setErrorImagen('La imagen debe ser JPG o PNG');
      return;
    }
    if (archivo.size > MAX_IMAGEN) {
      setErrorImagen('La imagen no puede pesar más de 5MB');
      return;
    }
    setErrorImagen('');
    setImagen(archivo);
    setQuitarImagen(false);
    setPreview(URL.createObjectURL(archivo));
  }

  function sacarImagen() {
    setImagen(null);
    setPreview(null);
    setQuitarImagen(editando && Boolean(evento?.imagenUrl));
  }

  async function onSubmit(datos) {
    setErrorServidor('');
    setEnviando(true);

    const formData = new FormData();
    const valores = esSuperadmin ? datos : { ...datos, hasSpe: evento?.hasSpe ?? false };
    Object.entries(valores).forEach(([clave, valor]) => {
      if (clave === 'campusId' && !esSuperadmin) return;
      formData.append(clave, typeof valor === 'boolean' ? String(valor) : valor);
    });
    if (imagen) formData.append('imagen', imagen);
    if (quitarImagen) formData.append('quitarImagen', 'true');

    try {
      const res = await apiFetch(editando ? `/api/events/${evento.id}` : '/api/events', {
        method: editando ? 'PATCH' : 'POST',
        headers: headersDe(token),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorServidor(data.error || 'No se pudo guardar el evento');
        return;
      }
      onGuardado(editando ? evento.id : data.eventId);
    } catch {
      setErrorServidor('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
      {/* Imagen opcional */}
      <div>
        <p className="text-sm font-medium text-ink">Imagen del evento <span className="font-normal text-ink/40">(opcional)</span></p>
        {preview ? (
          <div className="relative mt-2 aspect-[16/9] overflow-hidden rounded-xl bg-surface">
            <img src={preview} alt="Vista previa de la imagen del evento" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={sacarImagen}
              aria-label="Quitar imagen"
              className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 text-ink shadow hover:text-brand"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputImagen.current?.click()}
            className="mt-2 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-ink/40 hover:border-brand hover:text-brand"
          >
            <ImagePlus size={28} />
            <span className="text-sm font-medium">Subir imagen</span>
            <span className="text-[11px]">JPG o PNG, máximo 5MB</span>
          </button>
        )}
        {preview && (
          <button type="button" onClick={() => inputImagen.current?.click()} className="mt-2 text-xs font-semibold text-brand">
            Cambiar imagen
          </button>
        )}
        <input
          ref={inputImagen}
          type="file"
          accept="image/jpeg,image/png"
          onChange={elegirImagen}
          className="hidden"
          data-testid="input-imagen"
        />
        {errorImagen && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorImagen}</p>}
      </div>

      <div className="mt-6 space-y-4">
        <Campo label="Título" error={errors.titulo?.message}>
          <input {...register('titulo')} placeholder="Ej. Feria de educación financiera" className={CAMPO} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Fecha" error={errors.fecha?.message}>
            <input type="date" min={editando ? undefined : hoyIso()} {...register('fecha')} className={CAMPO} />
          </Campo>
          <Campo label="Hora" error={errors.hora?.message}>
            <input type="time" {...register('hora')} className={CAMPO} />
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Modalidad" error={errors.modalidad?.message}>
            <select {...register('modalidad')} className={CAMPO}>
              <option value="">Selecciona…</option>
              {MODALIDADES.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Cupos (opcional)" error={errors.cupos?.message}>
            <input type="number" min="1" inputMode="numeric" {...register('cupos')} placeholder="Sin límite" className={CAMPO} />
          </Campo>
        </div>

        <Campo label="Lugar o plataforma" error={errors.lugar?.message}>
          <input {...register('lugar')} placeholder="Ej. Auditorio Campus Tiquipaya o Zoom" className={CAMPO} />
        </Campo>

        {esSuperadmin && (
          <Campo label="Sede" error={errors.campusId?.message}>
            <select {...register('campusId')} className={CAMPO}>
              <option value="">Selecciona…</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}

        <Campo label="Enlace de inscripción (opcional)" error={errors.enlaceExterno?.message}>
          <input type="url" {...register('enlaceExterno')} placeholder="https://facebook.com/…" className={CAMPO} />
        </Campo>

        <Campo label="Descripción (opcional)" error={errors.descripcion?.message}>
          <textarea rows={5} {...register('descripcion')} className={CAMPO} />
        </Campo>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-medium text-ink">Encuestas que se toman en el evento</legend>
          <p className="text-xs text-ink/50">Si no marcas ninguna, es un evento sin encuesta (charla o taller) y no lleva encuestadores.</p>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" {...register('hasIca')} className="h-4 w-4 accent-maroon" /> Encuesta ICA
          </label>
          {esSuperadmin ? (
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" {...register('hasSpe')} className="h-4 w-4 accent-maroon" /> Encuesta SPE
            </label>
          ) : (
            <label className="mt-2 flex items-center gap-2 text-sm text-ink/40">
              <input type="checkbox" checked={evento?.hasSpe ?? false} disabled readOnly className="h-4 w-4 accent-maroon" /> Encuesta SPE
              <span className="text-xs">(solo el Superadmin puede habilitarla)</span>
            </label>
          )}
        </fieldset>
      </div>

      {errorServidor && (
        <p className="mt-5 rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {errorServidor}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 w-full rounded-lg bg-maroon py-2.5 text-sm font-semibold text-white hover:bg-maroon-light disabled:opacity-60"
      >
        {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar evento'}
      </button>
    </form>
  );
}

// El error va fuera del <label> para que el nombre accesible del campo sea solo la etiqueta.
function Campo({ label, error, children }) {
  return (
    <div>
      <label className="block">
        <span className="text-sm font-medium text-ink">{label}</span>
        <div className="mt-1">{children}</div>
      </label>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
