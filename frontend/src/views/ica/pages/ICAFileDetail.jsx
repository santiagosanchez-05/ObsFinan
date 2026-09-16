import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../shared/AuthContext';
import {
  ArrowLeft,
  Trash2,
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  BarChart3,
  Users,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

// Etiqueta corta + texto completo (para el tooltip del encabezado) de cada
// una de las 32 preguntas del instrumento ICA, en el mismo orden que
// CAMPOS_ENCUESTA del backend.
const PREGUNTAS = [
  ['q01ContributesFinancially', 'Contribuye económicamente', '¿Usted contribuye económicamente en su hogar y/o participa en la toma de decisiones financieras?'],
  ['q02Age', 'Edad', '¿Qué edad tiene?'],
  ['q03Sex', 'Sexo', '¿Cuál es su sexo?'],
  ['q04EducationLevel', 'Nivel de instrucción', 'Nivel de instrucción más alto alcanzado'],
  ['q05InsurancePurpose', 'Para qué sirve un seguro', '¿Para qué sirve un seguro?'],
  ['q06MandatoryInsuranceActivity', 'Actividad con seguro obligatorio', '¿En cuáles de las siguientes actividades necesita un seguro obligatorio?'],
  ['q07MeaningPolicyholder', "Significado 'tomador'", "¿Conoce el significado del término 'tomador' en un seguro?"],
  ['q08MeaningClaim', "Significado 'siniestro'", "¿Conoce el significado del término 'siniestro'?"],
  ['q09MeaningPremium', "Significado 'prima'", "¿Conoce el significado del término 'prima'?"],
  ['q10MeaningDeductible', "Significado 'franquicia'", "¿Conoce el significado del término 'franquicia'?"],
  ['q11MeaningExclusions', "Significado 'exclusiones'", "¿Conoce el significado del término 'exclusiones'?"],
  ['q12WhoSellsInsurance', 'Quién vende seguros', '¿Quién puede vender un seguro?'],
  ['q13WhoIsHarmedByFraud', 'A quién perjudica el fraude', '¿A quién perjudica más el fraude en el seguro?'],
  ['q14WhereToFileClaim', 'Dónde reclamar', '¿A dónde acudiría en primer lugar si tuviera que hacer una reclamación?'],
  ['q15HowAcquiredKnowledge', 'Cómo adquirió conocimientos', '¿De qué forma ha adquirido sus conocimientos en materia de seguros?'],
  ['q16BestMethodToImprove', 'Método para mejorar conocimientos', '¿Qué método considera más adecuado para mejorar sus conocimientos sobre seguros?'],
  ['q17WhoImprovesEducation', 'Quién mejora la educación', '¿Quién cree usted que se ocupa de mejorar la educación en materia de seguros de la población?'],
  ['q18HowToProtectYourself', 'Cómo protegerse', '¿Qué haría para protegerse y proteger a su familia y patrimonio de un posible riesgo?'],
  ['q19AnnualInsuranceSpend', 'Gasto anual en seguros', '¿Cuál es su gasto anual estimado en seguros?'],
  ['q20RetirementPreparation', 'Preparación para jubilación', '¿Qué está haciendo para preparar su jubilación?'],
  ['q21InsuranceCultureLevel', 'Nivel de cultura aseguradora', '¿Qué nivel de cultura aseguradora considera que tiene?'],
  ['q22HasLifeInsurance', 'Tiene seguro de vida', '¿Actualmente tiene un seguro de vida?'],
  ['q23LifeInsuranceDuration', 'Tiempo con seguro de vida', '¿Cuánto tiempo ha tenido su seguro de vida?'],
  ['q24ReasonAcquired', 'Razón de adquisición', '¿Cuál fue la razón principal por la que decidió adquirir un seguro de vida?'],
  ['q25PolicyReviewFrequency', 'Frecuencia de revisión de póliza', '¿Con qué frecuencia revisa o actualiza su póliza de seguro de vida?'],
  ['q26WouldSwitchProvider', 'Cambiaría de aseguradora', '¿Cambiaría de aseguradora o de plan?'],
  ['q27SatisfactionCurrentPolicy', 'Satisfacción con seguro actual', '¿Qué tan satisfecho está con su seguro de vida actual?'],
  ['q28LikelihoodFuturePurchase', 'Probabilidad de adquirir a futuro', '¿Qué tan probable es que considere adquirir un seguro de vida en el futuro?'],
  ['q29BarriersToPurchase', 'Barreras para contratar', '¿Cuáles son las principales barreras que le impiden contratar un seguro de vida?'],
  ['q30TrustInInsurers', 'Confianza en aseguradoras', '¿En qué medida confía en las aseguradoras en Bolivia?'],
  ['q31IncomePercentageWilling', '% de ingresos dispuesto', '¿Qué porcentaje de sus ingresos estaría dispuesto a destinar mensualmente para contratarlo?'],
  ['q32MostImportantFactor', 'Factor más importante', '¿Qué factor considera más importante al momento de decidir si contratar un seguro de vida?'],
];

function formatearFecha(valor) {
  if (!valor) return '-';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return '-';

  return fecha.toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ICAFileDetail() {
  const { id } = useParams();
  const { token } = useAuth();

  const [archivo, setArchivo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  useEffect(() => {
    let cancelado = false;

    async function cargarDetalle() {
      setCargando(true);
      setError('');

      try {
        const res = await fetch(`/api/ica/files/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || 'No se pudo cargar el detalle del archivo'
          );
        }

        if (!cancelado) {
          setArchivo(data.archivo);
          setRegistros(data.registros ?? []);
          setPaginaActual(1);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err.message || 'Error de conexión con el servidor'
          );
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      cancelado = true;
    };
  }, [id, token]);

  // Paginación
  const totalPaginas = Math.ceil(
    registros.length / registrosPorPagina
  );

  const indiceInicio =
    (paginaActual - 1) * registrosPorPagina;

  const indiceFin =
    indiceInicio + registrosPorPagina;

  const registrosPagina = registros.slice(
    indiceInicio,
    indiceFin
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">

        {/* Breadcrumb */}
        <Link
          to="/ica/historial"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"
        >
          <ArrowLeft size={13} />
          Volver al Historial
        </Link>

        {/* Encabezado */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">
            Detalle de archivo
          </h1>

          <button className="inline-flex items-center gap-2 self-start rounded-lg border border-[#f0b9c7] bg-[#fff5f7] px-4 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fde8ee] sm:self-auto">
            <Trash2 size={14} />
            Eliminar archivo
          </button>
        </div>

        {error && (
          <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {cargando ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e6e8] bg-white p-10 text-sm text-[#8a9290] shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Cargando detalle del archivo...
          </div>
        ) : archivo ? (
          <>
            {/* Tarjeta de metadatos del archivo */}
            <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e5f5ea] text-[#2f9e58]">
                    <FileSpreadsheet size={20} />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-[#252927]">
                      {archivo.nombre}
                    </p>

                    <p className="mt-0.5 text-xs text-[#8a9290]">
                      {archivo.comunidad} · {archivo.periodo}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:border-l lg:border-[#edf0f1] lg:pl-6">
                  <MetaItem
                    label="Comuna"
                    value={archivo.comunidad}
                  />

                  <MetaItem
                    label="Fecha de carga"
                    value={formatearFecha(archivo.fechaCarga)}
                  />

                  <MetaItem
                    label="Subido por"
                    value={archivo.subidoPor}
                  />

                  <MetaItem
                    label="Total registros"
                    value={`${archivo.totalRegistros} registros`}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                    archivo.estado === 'Verificado'
                      ? 'bg-[#eaf6ef] text-[#2f9e58]'
                      : 'bg-[#f1f3f3] text-[#78827f]'
                  }`}
                >
                  <CheckCircle2 size={11} />
                  {archivo.estado}
                </span>
              </div>
            </section>

            {/* Tabla */}
            <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-[#edf0f1] px-4 py-4">
                <h2 className="text-sm font-bold text-[#252927]">
                  Contenido del archivo
                </h2>

                <div className="flex items-center gap-3 text-[#8a9290]">
                  <button className="hover:text-[#a00046]">
                    <Search size={14} />
                  </button>

                  <button className="hover:text-[#a00046]">
                    <Filter size={14} />
                  </button>

                  <button className="hover:text-[#a00046]">
                    <Download size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="w-full text-left text-xs"
                  style={{
                    minWidth: `${140 + PREGUNTAS.length * 160}px`,
                  }}
                >
                  <thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                    <tr>
                      <th className="sticky left-0 z-10 bg-[#fafbfb] px-4 py-3">
                        #
                      </th>

                      {PREGUNTAS.map(
                        ([campo, corto, completo]) => (
                          <th
                            key={campo}
                            title={completo}
                            className="whitespace-nowrap px-4 py-3"
                          >
                            {corto}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {registros.length === 0 ? (
                      <tr>
                        <td
                          colSpan={PREGUNTAS.length + 1}
                          className="px-4 py-8 text-center text-[#8a9290]"
                        >
                          Este archivo no tiene entrevistas activas.
                        </td>
                      </tr>
                    ) : (
                      registrosPagina.map((r, index) => (
                        <tr
                          key={r.id}
                          className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]"
                        >
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-[#252927]">
                            {indiceInicio + index + 1}
                          </td>

                          {PREGUNTAS.map(([campo]) => (
                            <td
                              key={campo}
                              className="whitespace-nowrap px-4 py-3"
                            >
                              {r[campo] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col gap-3 border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290] sm:flex-row sm:items-center sm:justify-between">

                <span>
                  Mostrando{' '}
                  {registros.length === 0
                    ? 0
                    : indiceInicio + 1}
                  -
                  {Math.min(
                    indiceFin,
                    registros.length
                  )}{' '}
                  de {registros.length} registros
                </span>

                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1.5">

                    <button
                      onClick={() =>
                        setPaginaActual(paginaActual - 1)
                      }
                      disabled={paginaActual === 1}
                      className="rounded border border-[#e4e8e8] px-3 py-1.5 font-semibold text-[#59615e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>

                    {Array.from(
                      { length: totalPaginas },
                      (_, index) => index + 1
                    ).map((pagina) => (
                      <button
                        key={pagina}
                        onClick={() =>
                          setPaginaActual(pagina)
                        }
                        className={`rounded px-3 py-1.5 font-semibold ${
                          paginaActual === pagina
                            ? 'bg-[#a00046] text-white'
                            : 'border border-[#e4e8e8] text-[#59615e] hover:bg-[#f5f6f6]'
                        }`}
                      >
                        {pagina}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setPaginaActual(paginaActual + 1)
                      }
                      disabled={
                        paginaActual === totalPaginas
                      }
                      className="rounded border border-[#e4e8e8] px-3 py-1.5 font-semibold text-[#59615e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>

                  </div>
                )}
              </div>
            </section>

            {/* Resumen del archivo */}
            <section className="mt-5 grid gap-3 lg:grid-cols-3">

              <SummaryCard
                icon={<BarChart3 size={16} />}
                iconClass="bg-[#eaf1fb] text-[#2f6fb0]"
                label="Promedio global"
                value="62.1"
                suffix="Índice ICA"
                description="Valor de ejemplo — el cálculo real depende del motor de scoring, todavía pendiente."
              />

              <SummaryCard
                icon={<Users size={16} />}
                iconClass="bg-[#f6ecfb] text-[#a34fc4]"
                label="Brecha de género"
                value="3.4%"
                suffix="Diferencia H/M"
                description="Valor de ejemplo — el cálculo real depende del motor de scoring, todavía pendiente."
              />

              <article className="flex items-start gap-3 rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fbf1de] text-[#b7891e]">
                  <Info size={16} />
                </span>

                <div>
                  <p className="text-xs font-bold text-[#252927]">
                    Vista de revisión
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-[#8a9290]">
                    Este es un reporte consolidado. Los cambios realizados aquí se verán reflejados en los tableros generales del ICA.
                  </p>
                </div>
              </article>

            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
        {label}
      </span>

      <p className="text-xs font-semibold text-[#414845]">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  iconClass,
  label,
  value,
  suffix,
  description,
}) {
  return (
    <article className="rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm">

      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </span>

        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">
          {label}
        </p>
      </div>

      <p className="text-2xl font-bold text-[#a00046]">
        {value}{' '}
        <span className="text-sm font-semibold text-[#252927]">
          {suffix}
        </span>
      </p>

      <p className="mt-2 text-[11px] text-[#8a9290]">
        {description}
      </p>

    </article>
  );
}