import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import PanelRevision, { NO_APLICA } from '../components/Aprobaciones.PanelRevision';
import {
  Search,
  ChevronDown,
  Folder,
  SquarePen,
  Eye,
  Check,
  X,
  Clock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ICA —ESTÁTICO
//
// Estructura que debe devolver el backend de ICA:
//   manual -> respuestas: [{ grupo, items: [[pregunta, respuesta], ...] }]
//   masiva -> resumen: { estadisticas, grupos, alertas }
//
// Valores de una respuesta:
//   'texto'        respuesta normal
//   ['a', 'b']     varias opciones marcadas
//   null           sin responder (sale como alerta al aprobador)
//   NO_APLICA      la pregunta se salta por una respuesta anterior
// ---------------------------------------------------------------------------

// Preguntas del instrumento ICA, por número.
const PREGUNTAS_ICA = {
  1: "¿Usted contribuye económicamente en su hogar y/o participa en la toma de decisiones financieras?",
  2: "¿Qué edad tiene?",
  3: "¿Cuál es su sexo?",
  4: "Nivel de instrucción más alto alcanzado",
  5: "¿Para qué sirve un seguro?",
  6: "¿En cuáles de las siguientes actividades necesita un seguro obligatorio?",
  7: "¿Conoce el significado del término 'tomador' en un seguro?",
  8: "¿Conoce el significado del término 'siniestro'?",
  9: "¿Conoce el significado del término 'prima'?",
  10: "¿Conoce el significado del término 'franquicia'?",
  11: "¿Conoce el significado del término 'exclusiones'?",
  12: "¿Quién puede vender un seguro?",
  13: "¿A quién perjudica más el fraude en el seguro?",
  14: "¿A dónde acudiría en primer lugar si tuviera que hacer una reclamación?",
  15: "¿De qué forma ha adquirido sus conocimientos en materia de seguros?",
  16: "¿Qué método considera más adecuado para mejorar sus conocimientos sobre seguros?",
  17: "¿Quién cree usted que se ocupa de mejorar la educación en materia de seguros de la población?",
  18: "¿Qué haría para protegerse y proteger a su familia y patrimonio de un posible riesgo?",
  19: "¿Cuál es su gasto anual estimado en seguros?",
  20: "¿Qué está haciendo para preparar su jubilación?",
  21: "¿Qué nivel de cultura aseguradora considera que tiene?",
  22: "¿Actualmente tiene un seguro de vida?",
  23: "¿Cuánto tiempo ha tenido su seguro de vida?",
  24: "¿Cuál fue la razón principal por la que decidió adquirir un seguro de vida?",
  25: "¿Con qué frecuencia revisa o actualiza su póliza de seguro de vida?",
  26: "¿Cambiaría de aseguradora o de plan?",
  27: "¿Qué tan satisfecho está con su seguro de vida actual?",
  28: "¿Qué tan probable es que considere adquirir un seguro de vida en el futuro?",
  29: "¿Cuáles son las principales barreras que le impiden contratar un seguro de vida?",
  30: "¿En qué medida confía en las aseguradoras en Bolivia?",
  31: "¿Qué porcentaje de sus ingresos estaría dispuesto a destinar mensualmente para contratarlo?",
  32: "¿Qué factor considera más importante al momento de decidir si contratar un seguro de vida?",
};

// Bloques en que se muestran las preguntas en el panel de detalle.
const BLOQUES_ICA = [
  { grupo: 'Perfil', preguntas: [1, 2, 3, 4] },
  {
    grupo: 'Conocimiento de seguros',
    preguntas: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  },
  { grupo: 'Educación y cultura aseguradora', preguntas: [15, 16, 17, 21] },
  { grupo: 'Protección y previsión', preguntas: [18, 19, 20] },
  { grupo: 'Seguro de vida', preguntas: [22, 23, 24, 25, 26, 27] },
  { grupo: 'Intención y percepción', preguntas: [28, 29, 30, 31, 32] },
];

// Convierte { 1: 'Sí', 2: '34', ... } en [{ grupo, items }].
// Una pregunta ausente queda como null (sin responder).
function armarRespuestasIca(r) {
  return BLOQUES_ICA.map(({ grupo, preguntas }) => ({
    grupo,
    items: preguntas.map((n) => [PREGUNTAS_ICA[n], r[n] ?? null]),
  }));
}

const MOCK_ICA = [
  // Carga masiva
  {
    id: 101,
    tipo: 'masiva',
    origen: 'ica_zona_sur_3t2026.xlsx',
    zonas: ['Cotahuma', 'Sopocachi', 'San Antonio'],
    periodo: '3T 2026',
    registros: 48,
    encuestador: 'Carla Mamani',
    sede: 'La Paz',
    fecha: '2026-09-28T14:20:00',
    evento: 'Feria de Seguros La Paz',
    resumen: {
      estadisticas: [
        ['Edad mínima', '18'],
        ['Edad máxima', '67'],
        ['Edad promedio', '36'],
        ['Con seguro de vida', '19 de 48'],
        ['Cultura aseguradora más frecuente', 'Medio'],
      ],
      grupos: [
        {
          titulo: 'Encuestas por comuna',
          items: [
            ['Cotahuma', 20],
            ['Sopocachi', 16],
            ['San Antonio', 12],
          ],
        },
        {
          titulo: 'Sexo',
          items: [
            ['Mujer', 27],
            ['Hombre', 21],
          ],
        },
        {
          titulo: 'Nivel de instrucción',
          items: [
            ['Universidad', 22],
            ['Técnico', 11],
            ['Bachiller', 9],
            ['Postgrado', 6],
          ],
        },
        {
          titulo: 'Nivel de cultura aseguradora',
          items: [
            ['Muy bajo', 4],
            ['Bajo', 12],
            ['Medio', 19],
            ['Alto', 10],
            ['Muy alto', 3],
          ],
        },
        {
          titulo: 'Satisfacción con el seguro de vida (19 con seguro)',
          items: [
            ['Muy insatisfecho', 1],
            ['Insatisfecho', 2],
            ['Neutral', 4],
            ['Satisfecho', 8],
            ['Muy satisfecho', 4],
          ],
        },
        {
          titulo: 'Principal barrera (29 sin seguro de vida)',
          items: [
            ['Falta de información', 9],
            ['Precio elevado', 7],
            ['Falta de confianza', 6],
            ['No tengo ingresos suficientes', 4],
            ['No lo considero necesario', 3],
          ],
        },
      ],
      alertas: [
        '2 encuestas con la pregunta 12 vacía',
        '1 encuesta con edad no numérica en la pregunta 2',
        '3 encuestas dicen no tener seguro de vida pero respondieron antigüedad o satisfacción (preguntas 23 a 27)',
      ],
    },
  },

  // Manual: con seguro de vida, todo respondido
  {
    id: 102,
    tipo: 'manual',
    origen: 'Registro individual',
    zonas: ['Max Paredes'],
    periodo: '3T 2026',
    registros: 1,
    encuestador: 'Luis Quispe',
    sede: 'La Paz',
    fecha: '2026-09-28T09:05:00',
    evento: 'Feria de Seguros La Paz',
    respuestas: armarRespuestasIca({
      1: 'Sí',
      2: '34',
      3: 'Mujer',
      4: 'Universidad',
      5: 'Para proteger sus bienes y/o su familia ante sucesos inciertos',
      6: ['Contratar una hipoteca', 'Conducir un vehículo'],
      7: 'La persona que contrata el seguro',
      8: 'El perjuicio producido por una persona a otra u otras',
      9: 'La aportación económica que realiza el asegurado a la compañía de seguros',
      10: 'Una cantidad por la cual el asegurado es su propio asegurador',
      11: 'Los riesgos que no están incluidos en las coberturas de la póliza',
      12: 'Una compañía de seguros',
      13: 'A la compañía de seguro y a los asegurados',
      14: 'A la propia compañía de seguros',
      15: 'Con la experiencia personal',
      16: 'Consultar materiales diversos (Internet, libros u otros)',
      17: 'Los organismos reguladores del sector del seguro',
      18: 'Contratar un seguro',
      19: 'Entre Bs. 2,501 y Bs. 7,000',
      20: 'Está aportando a la gestora para cobrar una pensión',
      21: 'Medio',
      22: 'Sí',
      23: 'Entre 1 y 3 años',
      24: 'Protección financiera para mi familia',
      25: 'Anualmente',
      26: 'No, estoy satisfecho con mi seguro actual',
      27: 'Satisfecho',
      28: 'Muy probable',
      29: 'Precio elevado',
      30: 'Bastante',
      31: 'Entre 3% y 5% de mis ingresos',
      32: 'Beneficios y coberturas',
    }),
  },

  // Manual: sin seguro de vida (preguntas 23 a 27 "No aplica") y una sin responder
  {
    id: 103,
    tipo: 'manual',
    origen: 'Registro individual',
    zonas: ['Sopocachi'],
    periodo: '3T 2026',
    registros: 1,
    encuestador: 'Carla Mamani',
    sede: 'La Paz',
    fecha: '2026-09-30T11:30:00',
    evento: 'Feria de Seguros La Paz',
    respuestas: armarRespuestasIca({
      1: 'Sí',
      2: '52',
      3: 'Hombre',
      4: 'Bachiller',
      5: 'Para la cobertura de todos mis riesgos',
      6: ['Conducir un vehículo'],
      7: 'La persona que vende el seguro',
      8: 'El conjunto de bienes asegurados',
      9: 'El nivel de protección de los bienes',
      // 10 sin responder (queda null)
      11: 'Los riesgos a los que un hogar está expuesto',
      12: 'Un Banco',
      13: 'A la compañía aseguradora',
      14: 'Al Centro de atención al usuario y consumidor',
      15: 'No sabe de seguros o sabe muy poco',
      16: 'Asistir a cursos especializados',
      17: 'No se ocupa nadie',
      18: 'Ahorrar para subsanar los posibles daños futuros',
      19: 'Solo lo necesario para seguros obligatorios',
      20: 'No se lo ha planteado todavía',
      21: 'Bajo',
      22: 'No',
      23: NO_APLICA,
      24: NO_APLICA,
      25: NO_APLICA,
      26: NO_APLICA,
      27: NO_APLICA,
      28: 'Poco probable',
      29: 'No tengo ingresos suficientes',
      30: 'Poco',
      31: 'Hasta un 2% de mis ingresos',
      32: 'Precio',
    }),
  },
];

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const SISTEMAS = {
  ica: {
    id: 'ica',
    label: 'ICA',
    columnaZona: 'Comunas',
    placeholderBusqueda: 'Buscar por archivo, comuna o encuestador...',
    filtroZona: 'Todas las comunas',
    descripcion:
      'Encuestas ICA pendientes de revisión. Al aprobarlas pasan a contar en dashboards, explorador y exportación.',
  },
  spe: {
    id: 'spe',
    label: 'SPE',
    columnaZona: 'Sectores exportadores',
    placeholderBusqueda: 'Buscar por archivo, sector o encuestador...',
    filtroZona: 'Todos los sectores',
    descripcion:
      'Registros SPE pendientes de revisión. Al aprobarlos se recalculan los índices del sector.',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatearFecha(valor) {
  if (!valor) return '-';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return '-';

  return fecha.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function diasEspera(valor) {
  if (!valor) return 0;

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return 0;

  const ms = Date.now() - fecha.getTime();

  return Math.max(0, Math.floor(ms / 86400000));
}

/*
 * El backend puede devolver directamente un array o un objeto como
 * { pendientes: [...] }. Soportamos ambos casos para que el componente
 * no dependa de una sola envoltura de respuesta.
 */
function extraerPendientes(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.pendientes)) return data.pendientes;

  if (Array.isArray(data?.registros)) return data.registros;

  if (Array.isArray(data?.cargas)) return data.cargas;

  return [];
}

/*
 * Normalizamos los nombres que usa la pantalla.
 *
 * La UI trabaja siempre con:
 * id, tipo, origen, zonas, periodo, registros, encuestador,
 * sede, fecha, evento, resumen y respuestas.
 */
function normalizarRegistro(registro) {
  const tipo =
    registro.tipo ??
    (registro.source_type === 2 || registro.sourceType === 2
      ? 'masiva'
      : 'manual');

  const zonasOrigen =
    registro.zonas ?? registro.sectores ?? registro.sectorExportador;

  const zonas = zonasOrigen
    ? Array.isArray(zonasOrigen)
      ? zonasOrigen
      : [zonasOrigen]
    : [];

  return {
    ...registro,

    id:
      registro.id ??
      registro.dataLoadId ??
      registro.data_load_id ??
      registro.cargaId ??
      registro.carga_id,

    tipo,

    origen:
      registro.origen ??
      registro.nombreArchivo ??
      registro.nombre_archivo ??
      registro.filename ??
      registro.file_name ??
      'Registro individual',

    zonas,

    periodo:
      registro.periodo ??
      registro.period ??
      (registro.semester && registro.year
        ? `${registro.semester}S ${registro.year}`
        : '-'),

    registros:
      registro.registros ??
      registro.totalEncuestas ??
      registro.total_encuestas ??
      registro.cantidad ??
      1,

    encuestador:
      registro.encuestador ??
      registro.surveyor ??
      registro.encuestadorNombre ??
      registro.encuestador_nombre ??
      '-',

    sede:
      registro.sede ??
      registro.campus ??
      registro.campusNombre ??
      registro.campus_nombre ??
      '-',

    fecha:
      registro.fecha ??
      registro.fechaCarga ??
      registro.fecha_carga ??
      registro.created_at ??
      registro.createdAt,

    evento:
      registro.evento ??
      registro.event ??
      registro.eventName ??
      registro.event_name ??
      '-',

    resumen: registro.resumen ?? {
      estadisticas: [],
      grupos: [],
      alertas: [],
    },

    respuestas: registro.respuestas ?? [],
  };
}

// ---------------------------------------------------------------------------
// Acciones de cada fila
// ---------------------------------------------------------------------------

function AccionesFila({ onRevisar, onAprobar, onRechazar, disabled = false }) {
  return (
    <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onRevisar}
        className="inline-flex items-center gap-1 text-ink/50 transition hover:text-maroon"
      >
        <Eye size={15} /> Ver detalle
      </button>

      <button
        type="button"
        onClick={onRechazar}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-ink/50 transition hover:text-maroon disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink/50"
      >
        <X size={15} /> Rechazar
      </button>

      <button
        type="button"
        onClick={onAprobar}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-lg bg-maroon px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-maroon-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={13} /> Aprobar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function AprobacionesPage() {
  const { token, user } = useAuth();

  const rol = String(user?.rol ?? user?.role ?? '').toLowerCase();

  const esSuperadmin = rol === 'superadmin' || rol === 'super_admin';

  /*
   * ICA queda estático.
   * SPE sí viene del backend.
   */
  const [sistema, setSistema] = useState('spe');

  const [busqueda, setBusqueda] = useState('');
  const [zona, setZona] = useState('');
  const [sede, setSede] = useState('');

  const [pendientes, setPendientes] = useState({
    ica: MOCK_ICA,
    spe: [],
  });

  const [cargandoSpe, setCargandoSpe] = useState(true);
  const [error, setError] = useState('');

  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [aviso, setAviso] = useState('');

  const cfg = SISTEMAS[sistema];
  const lista = pendientes[sistema];

  // -------------------------------------------------------------------------
  // GET /api/spe/pendientes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (sistema !== 'spe') return;

    let cancelado = false;

    async function cargarPendientesSpe() {
      setCargandoSpe(true);
      setError('');

      try {
        const res = await fetch('/api/spe/pendientes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              data.error ||
              'No se pudieron cargar las cargas pendientes SPE',
          );
        }

        if (!cancelado) {
          const registros = extraerPendientes(data).map(normalizarRegistro);

          setPendientes((prev) => ({
            ...prev,
            spe: registros,
          }));
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'Error de conexión con el servidor');
        }
      } finally {
        if (!cancelado) {
          setCargandoSpe(false);
        }
      }
    }

    cargarPendientesSpe();

    return () => {
      cancelado = true;
    };
  }, [token, sistema]);

  // -------------------------------------------------------------------------
  // Filtros
  // -------------------------------------------------------------------------

  const zonas = useMemo(
    () => [...new Set(lista.flatMap((r) => r.zonas ?? []))].sort(),
    [lista],
  );

  const sedes = useMemo(
    () => [...new Set(lista.map((r) => r.sede).filter(Boolean))].sort(),
    [lista],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return lista.filter((r) => {
      if (zona && !(r.zonas ?? []).includes(zona)) return false;

      if (sede && r.sede !== sede) return false;

      if (!q) return true;

      return [r.origen, (r.zonas ?? []).join(' '), r.encuestador]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q));
    });
  }, [lista, busqueda, zona, sede]);

  const masAntigua = lista.length
    ? Math.max(...lista.map((r) => diasEspera(r.fecha)))
    : 0;

  const totalEncuestas = lista.reduce(
    (suma, r) => suma + Number(r.registros || 0),
    0,
  );

 

  useEffect(() => {
    if (!detalle || accion) return undefined;

    const alTeclear = (e) => {
      if (e.key === 'Escape') {
        setDetalle(null);
      }
    };

    window.addEventListener('keydown', alTeclear);

    return () => window.removeEventListener('keydown', alTeclear);
  }, [detalle, accion]);



  useEffect(() => {
    if (!aviso) return undefined;

    const id = setTimeout(() => setAviso(''), 4000);

    return () => clearTimeout(id);
  }, [aviso]);

  // -------------------------------------------------------------------------
  // Cambio de sistema
  // -------------------------------------------------------------------------

  function cambiarSistema(id) {
    setSistema(id);
    setBusqueda('');
    setZona('');
    setSede('');
    setAviso('');
    setError('');
    setDetalle(null);
  }

  // -------------------------------------------------------------------------
  // PATCH /api/spe/cargas/:id/estado
  // -------------------------------------------------------------------------

  async function confirmarAccion() {
    if (!accion) return;

    const { registro, tipo } = accion;

    if (!registro.id) {
      setError('La carga no tiene un identificador válido.');
      return;
    }

    setProcesando(true);
    setError('');

    try {
      const estado = tipo === 'aprobar' ? 'aprobada' : 'rechazada';

      const res = await fetch(`/api/spe/cargas/${registro.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estado,
          motivo: motivo.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'No se pudo actualizar el estado de la carga',
        );
      }

     
      setPendientes((prev) => ({
        ...prev,
        spe: prev.spe.filter((r) => r.id !== registro.id),
      }));

      setAviso(
        tipo === 'aprobar'
          ? `"${registro.origen}" aprobado. Ya cuenta en los dashboards.`
          : `"${registro.origen}" rechazado. No contará en los dashboards.`,
      );

      setAccion(null);
      setDetalle(null);
      setMotivo('');
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la carga');
    } finally {
      setProcesando(false);
    }
  }

  const cantidad = accion?.registro?.registros ?? 0;

  const tarjetas = [
    {
      label: 'Cargas pendientes',
      valor: cargandoSpe ? '...' : lista.length,
      Icono: Clock,
      estilo: 'bg-[#fbf1de] text-[#b7891e]',
    },
    {
      label: 'Encuestas por revisar',
      valor: cargandoSpe ? '...' : totalEncuestas,
      Icono: ShieldCheck,
      estilo: 'bg-[#fbe9f0] text-[#a00046]',
    },
    {
      label: 'Espera más larga',
      valor: cargandoSpe ? '...' : `${masAntigua} d`,
      Icono: Clock,
      estilo: 'bg-[#e8f1fb] text-[#2f6fb0]',
    },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">

      

      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2.5 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-lg"
        >
          <CheckCircle2 size={16} className="mt-px shrink-0 text-maroon" />

          <p className="text-xs font-medium text-ink">{aviso}</p>

          <button
            type="button"
            onClick={() => setAviso('')}
            aria-label="Cerrar aviso"
            className="-mr-1 shrink-0 rounded p-0.5 text-ink/40 hover:text-maroon"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {/* ----------------------------------------------------------------- */}
      {/* Confirmación aprobar */}
      {/* ----------------------------------------------------------------- */}

      <ConfirmDialog
        open={accion?.tipo === 'aprobar'}
        titulo="¿Aprobar esta carga?"
        mensaje={`Se aprobarán ${cantidad} ${
          cantidad === 1 ? 'encuesta' : 'encuestas'
        } de "${accion?.registro?.origen}" y se recalcularán los indicadores.`}
        textoConfirmar={procesando ? 'Procesando...' : 'Aprobar'}
        onConfirm={confirmarAccion}
        onCancel={() => !procesando && setAccion(null)}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Confirmación rechazar */}
      {/* ----------------------------------------------------------------- */}

      {accion?.tipo === 'rechazar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-bold text-[#202522]">
              ¿Rechazar esta carga?
            </h2>

            <p className="mt-1 text-sm text-[#6d7673]">
              Se rechazarán {cantidad}{' '}
              {cantidad === 1 ? 'encuesta' : 'encuestas'} de "
              {accion.registro.origen}". No contarán en los dashboards.
            </p>

            <label className="mt-4 block text-xs font-semibold text-[#59615e]">
              Motivo del rechazo{' '}
              <span className="font-normal text-[#8a9290]">(opcional)</span>

              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={255}
                rows={3}
                placeholder="Ej.: faltan respuestas en la encuesta"
                className="mt-1.5 w-full resize-none rounded-lg border border-[#dfe4e5] px-3 py-2 text-xs font-normal text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>

            <p className="mt-1 text-right text-[10px] text-[#8a9290]">
              {motivo.length}/255
            </p>

            <div className="mt-3 flex justify-end gap-2">
              <button
                disabled={procesando}
                onClick={() => {
                  setAccion(null);
                  setMotivo('');
                }}
                className="rounded-lg border border-[#dfe4e5] px-4 py-2 text-xs font-semibold text-[#59615e] hover:bg-[#f4f6f8] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                disabled={procesando}
                onClick={confirmarAccion}
                className="rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-maroon-light disabled:opacity-60"
              >
                {procesando ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Panel de revisión */}
      {/* ----------------------------------------------------------------- */}

      {detalle && (
        <PanelRevision
          registro={detalle}
          sistema={sistema}
          procesando={procesando}
          onClose={() => setDetalle(null)}
          onAccion={(registro, tipo) => {
            setMotivo('');
            setAccion({ registro, tipo });
          }}
        />
      )}

      <div className="mx-auto max-w-[1120px]">
        {/* Encabezado */}

        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">
            Aprobación de encuestas
          </h1>

          <p className="mt-1 text-sm text-[#6d7673]">{cfg.descripcion}</p>
        </div>

        {/* Tarjetas */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tarjetas.map(({ label, valor, Icono, estilo }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo}`}
              >
                <Icono size={16} />
              </span>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                  {label}
                </p>

                <p className="text-xl font-bold text-[#202522]">{valor}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs + filtros */}

        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm lg:flex-row lg:items-center">
          <div className="inline-flex rounded-lg bg-[#f4f6f8] p-1">
            {Object.values(SISTEMAS)
              .filter((s) => s.id !== 'spe' || esSuperadmin || !rol)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => cambiarSistema(s.id)}
                  className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                    sistema === s.id
                      ? 'bg-white text-[#202522] shadow-sm'
                      : 'text-[#8a9290] hover:text-[#59615e]'
                  }`}
                >
                  {s.label}

                  <span className="rounded-full bg-[#fbe9f0] px-1.5 py-0.5 text-[10px] font-bold text-[#a00046]">
                    {s.id === 'spe' && cargandoSpe
                      ? '...'
                      : pendientes[s.id].length}
                  </span>
                </button>
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
              >
                <option value="">{cfg.filtroZona}</option>

                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]"
              />
            </div>

            {esSuperadmin || !rol ? (
              <div className="relative">
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
                >
                  <option value="">Todas las sedes</option>

                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]"
                />
              </div>
            ) : null}

            <label className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]"
              />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={cfg.placeholderBusqueda}
                className="w-72 rounded-lg border border-[#dfe4e5] bg-white py-2 pl-8 pr-3 text-xs text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
          </div>
        </section>

        {/* Error */}

        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>

            <button
              onClick={() => setError('')}
              className="font-semibold hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tabla */}

        <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                <tr>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">{cfg.columnaZona}</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Encuestas</th>
                  <th className="px-4 py-3">Encuestador</th>
                  <th className="px-4 py-3">Fecha de carga</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {sistema === 'spe' && cargandoSpe ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-[#8a9290]"
                    >
                      <Loader2
                        size={18}
                        className="mx-auto mb-2 animate-spin"
                      />
                      Cargando cargas pendientes SPE...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-[#8a9290]"
                    >
                      {lista.length === 0
                        ? 'No hay cargas pendientes. Todo está al día.'
                        : 'Ninguna carga coincide con los filtros. Cambia o limpia los filtros para ver más.'}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => {
                    const espera = diasEspera(r.fecha);
                    const masiva = r.tipo === 'masiva';
                    const zonasR = r.zonas ?? [];

                    return (
                      <tr
                        key={r.id}
                        className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                masiva
                                  ? 'bg-[#e8f1fb] text-[#2f6fb0]'
                                  : 'bg-[#f3ecfb] text-[#7c4dbd]'
                              }`}
                            >
                              {masiva ? (
                                <Folder size={14} />
                              ) : (
                                <SquarePen size={14} />
                              )}
                            </span>

                            <div>
                              <p className="font-semibold text-[#252927]">
                                {r.origen}
                              </p>

                              <p
                                className={`text-[9px] font-bold uppercase tracking-wider ${
                                  masiva ? 'text-[#2f6fb0]' : 'text-[#7c4dbd]'
                                }`}
                              >
                                {masiva ? 'Carga masiva' : 'Manual'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3" title={zonasR.join(', ')}>
                          {zonasR.length === 1
                            ? zonasR[0]
                            : `${zonasR.length} ${
                                sistema === 'ica' ? 'comunas' : 'sectores'
                              }`}

                          {zonasR.length > 1 && (
                            <p className="max-w-[180px] truncate text-[10px] text-[#8a9290]">
                              {zonasR.join(', ')}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">{r.periodo}</td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#f1f3f3] px-2 py-1 text-[10px] font-bold text-[#414845]">
                            {r.registros}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#252927]">
                            {r.encuestador}
                          </p>

                          <p className="text-[10px] text-[#8a9290]">
                            Sede {r.sede}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p>{formatearFecha(r.fecha)}</p>

                          <p
                            className={`text-[10px] ${
                              espera >= 3
                                ? 'font-semibold text-[#b7891e]'
                                : 'text-[#8a9290]'
                            }`}
                          >
                            {espera === 0 ? 'Hoy' : `Hace ${espera} d`}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <AccionesFila
                            disabled={procesando}
                            onRevisar={() => setDetalle(r)}
                            onRechazar={() =>
                              setAccion({ registro: r, tipo: 'rechazar' })
                            }
                            onAprobar={() =>
                              setAccion({ registro: r, tipo: 'aprobar' })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290]">
            <span>
              Mostrando {filtrados.length} de {lista.length} cargas pendientes
            </span>

            {procesando && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Procesando...
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}