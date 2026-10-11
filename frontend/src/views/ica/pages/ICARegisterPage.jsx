import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import { periodoDelEvento } from '../../encuestador/useEventoEncuesta';

const CAMPO_ICA = 'w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-2 outline-none focus:border-brand';

const PREGUNTAS = [
  ['q01ContributesFinancially', '¿Usted contribuye económicamente en su hogar y/o participa en la toma de decisiones financieras?', ['Sí', 'No']],
  ['q02Age', '¿Qué edad tiene?', 'number'],
  ['q03Sex', '¿Cuál es su sexo?', ['Mujer', 'Hombre']],
  ['q04EducationLevel', 'Nivel de instrucción más alto alcanzado', ['Bachiller', 'Técnico', 'Universidad', 'Postgrado']],
  ['q05InsurancePurpose', '¿Para qué sirve un seguro?', ['Para proteger sus bienes y/o su familia ante sucesos inciertos', 'Para la cobertura de todos mis riesgos', 'Para evitar posibles situaciones de riesgo', 'Para penalizar a los causantes de un siniestro', 'Para mantener “como nuevos” los bienes']],
  ['q06MandatoryInsuranceActivity', '¿En cuáles de las siguientes actividades necesita un seguro obligatorio?', ['Contratar una hipoteca', 'Conducir un vehículo', 'Viajar en transporte público', 'Comprarse un vehículo nuevo', 'Cazar', 'Trabajar en construcción', 'Viajar']],
  ['q07MeaningPolicyholder', "¿Conoce el significado del término 'tomador' en un seguro?", ['La persona que contrata el seguro', 'El profesional que asesora sobre seguros', 'La persona que vende el seguro', 'La persona que vende seguros de otro por comisión', 'La entidad aseguradora']],
  ['q08MeaningClaim', "¿Conoce el significado del término 'siniestro'?", ['El perjuicio producido por una persona a otra u otras', 'El conjunto de bienes asegurados', 'La cantidad que recibe el asegurado cuando se produce un siniestro', 'El contrato de seguro', 'La cantidad que recibe la aseguradora del asegurado']],
  ['q09MeaningPremium', "¿Conoce el significado del término 'prima'?", ['La aportación económica que realiza el asegurado a la compañía de seguros', 'El nivel de protección de los bienes', 'La cantidad máxima que va a pagar la aseguradora en caso de siniestro', 'El valor del bien que ha sufrido el siniestro', 'El periodo de tiempo inicial durante el cual no tienen efecto las coberturas']],
  ['q10MeaningDeductible', "¿Conoce el significado del término 'franquicia'?", ['Una cantidad por la cual el asegurado es su propio asegurador', 'El organismo de inspección y supervisión de la actividad aseguradora', 'El valor del bien asegurado', 'La entidad aseguradora', 'La entidad autorizada para el ejercicio de la actividad aseguradora']],
  ['q11MeaningExclusions', "¿Conoce el significado del término 'exclusiones'?", ['Los riesgos que no están incluidos en las coberturas de la póliza', 'Los riesgos a los que un hogar está expuesto', 'Los trabajos previos a la realización de un contrato de seguros', 'Las condiciones particulares del contrato de seguro', 'El conjunto de bienes no asegurados']],
  ['q12WhoSellsInsurance', '¿Quién puede vender un seguro?', ['Una notaría', 'Una corredora de seguros', 'Una compañía de seguros', 'Un comparador de seguros por Internet', 'Una asociación de consumidores', 'Un Banco']],
  ['q13WhoIsHarmedByFraud', '¿A quién perjudica más el fraude en el seguro?', ['A la persona que vendió el seguro', 'A la compañía aseguradora', 'Al defraudador', 'A la compañía de seguro y a los asegurados', 'A las administraciones públicas']],
  ['q14WhereToFileClaim', '¿A dónde acudiría en primer lugar si tuviera que hacer una reclamación?', ['Al Banco Central de Bolivia', 'A la propia compañía de seguros', 'Al Centro de atención al usuario y consumidor', 'A la Autoridad de Fiscalización y Control de Pensiones y Seguros (APS)', 'A la Policía']],
  ['q15HowAcquiredKnowledge', '¿De qué forma ha adquirido sus conocimientos en materia de seguros?', ['No sabe de seguros o sabe muy poco', 'Con la experiencia personal', 'A través de su profesión', 'En la escuela o el instituto', 'A través de estudios superiores']],
  ['q16BestMethodToImprove', '¿Qué método considera más adecuado para mejorar sus conocimientos sobre seguros?', ['No le interesa mejorarlos', 'Asistir a cursos especializados', 'Preguntar a familiares o amistades', 'Consultar materiales diversos (Internet, libros u otros)', 'Ninguno de los anteriores le merece garantías']],
  ['q17WhoImprovesEducation', '¿Quién cree usted que se ocupa de mejorar la educación en materia de seguros de la población?', ['Los usuarios de seguros', 'Asociaciones o colegios profesionales y/o compañías aseguradoras', 'Los organismos reguladores del sector del seguro', 'Asociaciones de usuarios de seguros', 'No se ocupa nadie']],
  ['q18HowToProtectYourself', '¿Qué haría para protegerse y proteger a su familia y patrimonio de un posible riesgo?', ['Evitar al máximo cualquier situación de riesgo', 'Ahorrar para subsanar los posibles daños futuros', 'Contratar un seguro', 'Instalar una alarma en casa', 'No hacer nada y asumir las consecuencias']],
  ['q19AnnualInsuranceSpend', '¿Cuál es su gasto anual estimado en seguros?', ['Nada', 'Menos de Bs. 2,500', 'Entre Bs. 2,501 y Bs. 7,000', 'Más de Bs. 7,000', 'Solo lo necesario para seguros obligatorios']],
  ['q20RetirementPreparation', '¿Qué está haciendo para preparar su jubilación?', ['Está aportando a la gestora para cobrar una pensión', 'Está ahorrando', 'Está comprando bienes (joyas, cuadros, vivienda u otros)', 'Está aporte a la gestora y a su vez cuenta con un plan de jubilación privado', 'No se lo ha planteado todavía']],
  ['q21InsuranceCultureLevel', '¿Qué nivel de cultura aseguradora considera que tiene?', ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto']],
  ['q22HasLifeInsurance', '¿Actualmente tiene un seguro de vida?', ['Sí', 'No']],
  ['q23LifeInsuranceDuration', '¿Cuánto tiempo ha tenido su seguro de vida?', ['Menos de un año', 'Entre 1 y 3 años', 'Más de 3 años'], 'si'],
  ['q24ReasonAcquired', '¿Cuál fue la razón principal por la que decidió adquirir un seguro de vida?', ['Protección financiera para mi familia', 'Requerimiento de una entidad financiera', 'Consejo de un familiar o amigo', 'Otra (Especifique)'], 'si'],
  ['q25PolicyReviewFrequency', '¿Con qué frecuencia revisa o actualiza su póliza de seguro de vida?', ['Anualmente', 'Cada dos años', 'Rara vez', 'Nunca'], 'si'],
  ['q26WouldSwitchProvider', '¿Cambiaría de aseguradora o de plan?', ['Sí, por mejores beneficios', 'Sí, por menor costo', 'No, estoy satisfecho con mi seguro actual', 'No lo sé'], 'si'],
  ['q27SatisfactionCurrentPolicy', '¿Qué tan satisfecho está con su seguro de vida actual?', ['Muy insatisfecho', 'Insatisfecho', 'Neutral (ni satisfecho ni insatisfecho)', 'Satisfecho', 'Muy satisfecho'], 'si'],
  ['q28LikelihoodFuturePurchase', '¿Qué tan probable es que considere adquirir un seguro de vida en el futuro?', ['Muy improbable', 'Poco probable', 'Neutral (ni probable ni improbable)', 'Probable', 'Muy probable'], 'no'],
  ['q29BarriersToPurchase', '¿Cuáles son las principales barreras que le impiden contratar un seguro de vida?', ['Falta de información sobre seguros de vida', 'Falta de confianza en las aseguradoras', 'Precio elevado', 'No lo considero necesario', 'No tengo ingresos suficientes'], 'no'],
  ['q30TrustInInsurers', '¿En qué medida confía en las aseguradoras en Bolivia?', ['Nada', 'Poco', 'Neutral', 'Bastante', 'Mucho']],
  ['q31IncomePercentageWilling', '¿Qué porcentaje de sus ingresos estaría dispuesto a destinar mensualmente para contratarlo?', ['No pagaría nada', 'Hasta un 2% de mis ingresos', 'Entre 3% y 5% de mis ingresos', 'Entre 6% y 10% de mis ingresos', 'Más del 10% de mis ingresos']],
  ['q32MostImportantFactor', '¿Qué factor considera más importante al momento de decidir si contratar un seguro de vida?', ['Precio', 'Beneficios y coberturas', 'Confianza en la aseguradora', 'Experiencia previa con seguros', 'Recomendación de un familiar o amigo']],
];

// Superadmin (US65): si hay comunas de varias sedes, se muestra la sede al lado.
function etiquetaComuna(comuna, lista) {
  const variasSedes = new Set(lista.map((c) => c.campusId)).size > 1;
  return variasSedes && comuna.sede ? `${comuna.nombre} (${comuna.sede})` : comuna.nombre;
}

export default function ICARegisterPage({ eventId = null, evento = null, encuestador = false }) {
  // Desde "Mis eventos" el período lo da la fecha del evento (lo calcula el backend).
  const periodoEvento = encuestador ? periodoDelEvento(evento?.fecha) : null;
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
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      year: new Date().getFullYear(),
      quarter: 3,
    },
  });
  const tieneSeguro = watch('q22HasLifeInsurance');

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
    // El encuestador no manda el período: lo pone el backend con la fecha del evento.
    const { year, quarter, ...respuestas } = datos;
    const cuerpo = encuestador ? { ...respuestas, eventId: Number(eventId) } : { year, quarter, ...respuestas };
    try {
      const respuesta = await fetch('/api/ica/entrevistas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cuerpo),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar la entrevista');
      setGuardado(true);
    } catch (err) {
      setErrorServidor(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (guardado) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-xl border border-line bg-card p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-[#3c8d66]" />
          <h1 className="mt-3 text-xl font-bold text-ink">Formulario completado</h1>
          <p className="mt-2 text-sm text-muted">{encuestador ? 'La encuesta se guardó correctamente y quedó pendiente de aprobación.' : 'La entrevista se guardó correctamente y sus resultados ya están disponibles en el dashboard ICA.'}</p>
          <Link to={encuestador ? '/encuestador/eventos' : '/ica'} className="mt-6 inline-flex rounded-lg bg-maroon px-5 py-2.5 text-xs font-semibold text-white hover:bg-maroon-dark">
            {encuestador ? 'Volver a mis eventos' : 'Volver al dashboard'}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link to={encuestador ? '/encuestador/eventos' : '/ica'} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
          <ArrowLeft size={13} /> {encuestador ? 'Volver a mis eventos' : 'Volver al Dashboard ICA'}
        </Link>

        <div className="mb-5 mt-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{encuestador ? 'Encuesta de campo' : 'Registro individual'}</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{encuestador ? 'Registrar encuesta ICA' : 'Registrar nuevo registro — ICA'}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">Aplica el instrumento ICA a una persona. Las respuestas se organizan en 32 preguntas y la pregunta 22 define el bloque que corresponde completar.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-line bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-brand-soft px-3 py-2.5 text-[11px] text-muted">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-maroon text-xs font-bold text-white">32</span>
            <span><strong className="text-ink">Instrumento individual</strong><br />Completa una respuesta por pregunta.</span>
          </div>

          <div className="grid gap-4 border-b border-line pb-5 sm:grid-cols-2">
            <Campo label="Comuna" error={errors.communityId?.message}>
              <select {...register('communityId', { required: 'Selecciona una comuna' })} defaultValue="" disabled={cargandoComunas || Boolean(errorComunas)} className={CAMPO_ICA}>
                <option value="" disabled>{cargandoComunas ? 'Cargando comunas...' : 'Selecciona una comuna'}</option>
                {comunas.map((comuna) => <option key={comuna.id} value={comuna.id}>{etiquetaComuna(comuna, comunas)}</option>)}
              </select>
              {errorComunas && <span className="mt-1 block text-[10px] text-brand">{errorComunas}</span>}
            </Campo>
            {periodoEvento ? (
              <div className="rounded-lg border border-line bg-subtle px-3 py-2.5 text-xs text-muted">
                <span className="block text-[11px] font-bold text-ink-2">Evento</span>
                <span className="block font-semibold text-ink">{evento.titulo}</span>
                <span>Período: Q{periodoEvento.quarter} {periodoEvento.year} (según la fecha del evento)</span>
              </div>
            ) : (
              <>
                <Campo label="Año" error={errors.year?.message}>
                  <input type="number" {...register('year', { required: 'Ingresa el año' })} className={CAMPO_ICA} />
                </Campo>
                <Campo label="Trimestre" error={errors.quarter?.message}>
                  <select {...register('quarter')} className={CAMPO_ICA}>
                    {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}
                  </select>
                </Campo>
              </>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {PREGUNTAS.map(([campo, pregunta, opciones, condicion], indice) => {
              if (condicion === 'si' && tieneSeguro !== 'Sí') return null;
              if (condicion === 'no' && tieneSeguro !== 'No') return null;
              return (
                <Pregunta
                  key={campo}
                  numero={indice + 1}
                  campo={campo}
                  pregunta={pregunta}
                  opciones={opciones}
                  register={register}
                  error={errors[campo]?.message}
                />
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-surface p-3 text-[11px] text-ink-2">
            <Info size={15} className="mt-0.5 shrink-0 text-brand" />
            <p>Las respuestas se validan antes de guardarse y alimentan los indicadores del dashboard ICA.</p>
          </div>

          {errorServidor && <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">{errorServidor}</p>}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link to="/ica" className="text-center text-xs font-semibold text-ink-2 hover:text-brand">Cancelar</Link>
            <button type="submit" disabled={enviando} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-maroon px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-maroon-dark disabled:opacity-60">{enviando ? 'Guardando...' : 'Guardar entrevista'} <ChevronRight size={14} /></button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Pregunta({ numero, campo, pregunta, opciones, register, error }) {
  const esNumero = opciones === 'number';

  return (
    <fieldset className="rounded-lg border border-line p-3.5 transition-colors focus-within:border-brand-line sm:p-4">
      <legend className="max-w-full px-1 text-[13px] font-semibold leading-5 text-ink">
        <span className="mr-2 text-[11px] font-bold text-brand">{String(numero).padStart(2, '0')}</span>{pregunta}
      </legend>
      {esNumero ? (
        <input type="number" min="0" max="120" {...register(campo, { required: 'Respondé esta pregunta' })} className={`${CAMPO_ICA} mt-3 max-w-45`} placeholder="Edad" />
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {opciones.map((opcion) => (
            <label key={opcion} className="flex cursor-pointer items-start gap-2 rounded-md border border-line px-2.5 py-2 text-[11px] leading-4 text-ink-2 hover:border-brand-line hover:bg-brand-soft">
              <input type="radio" value={opcion} {...register(campo, { required: 'Seleccioná una respuesta' })} className="mt-0.5 accent-maroon" />
              <span>{opcion}</span>
            </label>
          ))}
        </div>
      )}
      {error && <span className="mt-2 block text-[10px] text-brand">{error}</span>}
    </fieldset>
  );
}

function Campo({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[10px] text-brand">{error}</span>}
    </label>
  );
}
