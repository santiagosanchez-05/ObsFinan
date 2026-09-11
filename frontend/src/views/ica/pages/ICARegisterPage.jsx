import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

const registrarIcaSchema = z.object({
  communityId: z.string().min(1, 'Seleccioná una comuna'),
  year: z.coerce.number().int().min(2019).max(new Date().getFullYear()),
  quarter: z.coerce.number().int().min(1).max(4),
  conocimiento: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
  uso: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
  educacion: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
  prevision: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
  icaHombres: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
  icaMujeres: z.coerce.number().min(0, 'El puntaje mínimo es 0').max(100, 'El puntaje máximo es 100'),
});

const CAMPO_ICA = 'w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs text-[#414845] outline-none focus:border-[#a00046]';

export default function ICARegisterPage() {
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const [comunas, setComunas] = useState([]);
  const [cargandoComunas, setCargandoComunas] = useState(true);
  const [errorComunas, setErrorComunas] = useState('');
  const { token } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrarIcaSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      quarter: 3,
      conocimiento: 0,
      uso: 0,
      educacion: 0,
      prevision: 0,
      icaHombres: 0,
      icaMujeres: 0,
    },
  });

  useEffect(() => {
    let cancelado = false;

    async function cargarComunas() {
      try {
        const res = await fetch('/api/ica/comunidades', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las comunas');
        if (!cancelado) setComunas(data.comunidades ?? []);
      } catch (err) {
        if (!cancelado) setErrorComunas(err.message);
      } finally {
        if (!cancelado) setCargandoComunas(false);
      }
    }

    cargarComunas();
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function onSubmit(datos) {
    setErrorServidor('');
    setEnviando(true);
    try {
      const res = await fetch('/api/ica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el registro ICA');
      setGuardado(true);
    } catch (err) {
      setErrorServidor(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (guardado) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e6e8] bg-white p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-[#3c8d66]" />
          <h1 className="mt-3 text-xl font-bold text-[#252927]">Registro preparado correctamente</h1>
          <p className="mt-2 text-sm text-[#6d7673]">El registro fue guardado correctamente y ya forma parte de los datos del dashboard ICA.</p>
          <Link to="/ica" className="mt-6 inline-flex rounded-lg bg-[#a00046] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#820039]">
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/ica" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline">
          <ArrowLeft size={13} /> Volver al Dashboard ICA
        </Link>

        <div className="mb-5 mt-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a00046]">Registro individual</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Registrar nuevo registro — ICA</h1>
          <p className="mt-1 text-sm text-[#6d7673]">Ingresá los resultados de una comuna para el período seleccionado.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-[#e2e6e8] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 border-b border-[#edf0f1] pb-5 sm:grid-cols-2">
            <Campo label="Comuna" error={errors.communityId?.message}>
              <select {...register('communityId')} defaultValue="" disabled={cargandoComunas || Boolean(errorComunas)} className={CAMPO_ICA}>
                <option value="" disabled>{cargandoComunas ? 'Cargando comunas...' : 'Selecciona una comuna'}</option>
                {comunas.map((comuna) => <option key={comuna.id} value={comuna.id}>{comuna.nombre}</option>)}
              </select>
              {errorComunas && <span className="mt-1 block text-[10px] text-[#a00046]">{errorComunas}</span>}
            </Campo>
            <Campo label="Año" error={errors.year?.message}>
              <input type="number" {...register('year')} className={CAMPO_ICA} />
            </Campo>
            <Campo label="Trimestre" error={errors.quarter?.message}>
              <select {...register('quarter')} className={CAMPO_ICA}>
                {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}
              </select>
            </Campo>
          </div>

          <fieldset className="mt-5 border-b border-[#edf0f1] pb-5">
            <legend className="mb-3 border-l-2 border-[#a00046] pl-2 text-xs font-bold uppercase tracking-wider text-[#252927]">Dimensiones del ICA (0 a 100)</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Conocimiento" error={errors.conocimiento?.message}><input type="number" step="0.1" {...register('conocimiento')} className={CAMPO_ICA} /></Campo>
              <Campo label="Uso" error={errors.uso?.message}><input type="number" step="0.1" {...register('uso')} className={CAMPO_ICA} /></Campo>
              <Campo label="Educación" error={errors.educacion?.message}><input type="number" step="0.1" {...register('educacion')} className={CAMPO_ICA} /></Campo>
              <Campo label="Previsión" error={errors.prevision?.message}><input type="number" step="0.1" {...register('prevision')} className={CAMPO_ICA} /></Campo>
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-3 border-l-2 border-[#a00046] pl-2 text-xs font-bold uppercase tracking-wider text-[#252927]">ICA por género (0 a 100)</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="ICA hombres" error={errors.icaHombres?.message}><input type="number" step="0.1" {...register('icaHombres')} className={CAMPO_ICA} /></Campo>
              <Campo label="ICA mujeres" error={errors.icaMujeres?.message}><input type="number" step="0.1" {...register('icaMujeres')} className={CAMPO_ICA} /></Campo>
            </div>
          </fieldset>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#f4f6f8] p-3 text-[11px] text-[#59615e]">
            <Info size={15} className="mt-0.5 shrink-0 text-[#a00046]" />
            <p>Todos los puntajes deben registrarse en una escala de 0 a 100.</p>
          </div>

          {errorServidor && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorServidor}</p>}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link to="/ica" className="text-center text-xs font-semibold text-[#59615e] hover:text-[#a00046]">Cancelar</Link>
            <button type="submit" disabled={enviando} className="rounded-lg bg-[#a00046] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#820039] disabled:opacity-60">{enviando ? 'Guardando...' : 'Guardar registro'}</button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Campo({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[10px] text-[#a00046]">{error}</span>}
    </label>
  );
}
