import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import ConfirmDialog from '../../../shared/ConfirmDialog';
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

// Monserrat — US58 · US59 (ICA) · US62 (SPE). Bandeja de aprobación de encuestas.
// SOLO VISUAL: los datos son de ejemplo. Los TODO marcan dónde conectar el backend.

// ---------------------------------------------------------------------------
// Datos de ejemplo (reemplazar por GET /api/ica/pendientes y /api/spe/pendientes)
// ---------------------------------------------------------------------------
// Masiva -> `resumen` (lo calcula el backend). Manual -> `respuestas` (las de esa única encuesta).
// Las respuestas de ejemplo son parciales; en real serían q01–q32 (ICA) y s1–s8 (SPE).
const MOCK_ICA = [
  {
    id: 101, tipo: 'masiva', origen: 'ica_zona_sur_3t2026.xlsx', zonas: ['Cotahuma', 'Sopocachi', 'San Antonio'], periodo: '3T 2026', registros: 48,
    encuestador: 'Carla Mamani', sede: 'La Paz', fecha: '2026-09-28T14:20:00', evento: 'Feria de Seguros La Paz',
    resumen: {
      estadisticas: [['Edad mínima', '18'], ['Edad máxima', '67'], ['Edad promedio', '36']],
      grupos: [
        { titulo: 'Encuestas por comuna', items: [['Cotahuma', 20], ['Sopocachi', 16], ['San Antonio', 12]] },
        { titulo: 'Sexo', items: [['Mujer', 27], ['Hombre', 21]] },
      ],
      alertas: ['2 encuestas con la pregunta 12 vacía'],
    },
  },
  {
    id: 102, tipo: 'manual', origen: 'Registro individual', zonas: ['Max Paredes'], periodo: '3T 2026', registros: 1,
    encuestador: 'Luis Quispe', sede: 'La Paz', fecha: '2026-09-28T09:05:00', evento: 'Feria de Seguros La Paz',
    respuestas: [
      { grupo: 'Perfil', items: [['Aporta económicamente al hogar', 'Sí'], ['Edad', '34'], ['Sexo', 'Mujer'], ['Nivel de educación', 'Universidad']] },
      { grupo: 'Conocimiento', items: [['¿Para qué sirve un seguro?', 'Para proteger sus bienes y/o su familia ante sucesos inciertos'], ['¿Dónde presentar un reclamo?', 'A la propia compañía de seguros'], ['¿Cómo adquirió su conocimiento?', 'Con la experiencia personal']] },
      { grupo: 'Seguro de vida', items: [['¿Tiene seguro de vida?', 'Sí'], ['Duración', 'Entre 1 y 3 años'], ['Satisfacción con su póliza', 'Satisfecho'], ['Confianza en aseguradoras', 'Bastante']] },
    ],
  },
  {
    id: 103, tipo: 'masiva', origen: 'ica_el_alto_d1.xlsx', zonas: ['Ciudad Satélite', 'Villa Adela'], periodo: '2T 2026', registros: 112,
    encuestador: 'Rosa Choque', sede: 'La Paz', fecha: '2026-09-27T17:45:00', evento: 'Jornada de educación financiera',
    resumen: {
      estadisticas: [['Edad mínima', '3'], ['Edad máxima', '71'], ['Edad promedio', '39']],
      grupos: [
        { titulo: 'Encuestas por comuna', items: [['Ciudad Satélite', 70], ['Villa Adela', 42]] },
        { titulo: 'Sexo', items: [['Mujer', 58], ['Hombre', 54]] },
      ],
      alertas: ['1 encuesta con edad de 3 años', '4 encuestas con la pregunta 20 vacía'],
    },
  },
  {
    id: 104, tipo: 'manual', origen: 'Registro individual', zonas: ['Periférica'], periodo: '3T 2026', registros: 1,
    encuestador: 'Diego Flores', sede: 'Cochabamba', fecha: '2026-09-26T11:10:00', evento: 'Feria de Seguros Cochabamba',
    respuestas: [
      { grupo: 'Perfil', items: [['Aporta económicamente al hogar', 'No'], ['Edad', '52'], ['Sexo', 'Hombre'], ['Nivel de educación', 'Técnico']] },
      { grupo: 'Seguro de vida', items: [['¿Tiene seguro de vida?', 'No'], ['Principal barrera para comprar', 'Precio elevado'], ['Confianza en aseguradoras', 'Poco']] },
    ],
  },
  {
    id: 105, tipo: 'masiva', origen: 'ica_centro_2t2026.xlsx', zonas: ['Centro'], periodo: '2T 2026', registros: 76,
    encuestador: 'Carla Mamani', sede: 'La Paz', fecha: '2026-09-25T16:30:00', evento: 'Feria de Seguros La Paz',
    resumen: {
      estadisticas: [['Edad mínima', '19'], ['Edad máxima', '64'], ['Edad promedio', '33']],
      grupos: [
        { titulo: 'Encuestas por comuna', items: [['Centro', 76]] },
        { titulo: 'Sexo', items: [['Mujer', 41], ['Hombre', 35]] },
      ],
      alertas: [],
    },
  },
];

const MOCK_SPE = [
  {
    id: 201, tipo: 'masiva', origen: 'spe_exportadores_1s2026.xlsx', zonas: ['Manufactura', 'Textiles', 'Químico'], periodo: '1S 2026', registros: 64,
    encuestador: 'Marco Vargas', sede: 'La Paz', fecha: '2026-09-29T10:15:00', evento: 'Encuentro de exportadores',
    resumen: {
      estadisticas: [['Con certificaciones', '41 de 64'], ['Planean nuevos mercados', '38 de 64']],
      grupos: [
        { titulo: 'Encuestas por sector', items: [['Manufactura', 30], ['Textiles', 20], ['Químico', 14]] },
        { titulo: 'Tamaño de empresa', items: [['Micro', 10], ['Pequeña', 24], ['Mediana', 20], ['Grande', 10]] },
      ],
      alertas: ['3 encuestas sin puntaje en la sección 4'],
    },
  },
  {
    id: 202, tipo: 'manual', origen: 'Registro individual', zonas: ['Agroindustria'], periodo: '1S 2026', registros: 1,
    encuestador: 'Elena Rojas', sede: 'Santa Cruz', fecha: '2026-09-27T15:00:00', evento: 'Encuentro de exportadores',
    respuestas: [
      { grupo: 'Perfil de la empresa', items: [['Departamento', 'Santa Cruz'], ['Sector exportador', 'Agroindustria'], ['Tamaño', 'Mediana'], ['Años exportando', '11 a 20']] },
      { grupo: 'Expectativas', items: [['Expectativa del PIB', 'Estable'], ['Expectativa de exportaciones', 'Aumentarán moderadamente']] },
      { grupo: 'Financiamiento y divisas', items: [['Fuente principal de financiamiento', 'Bancos'], ['Impacto de la escasez de divisas', 'Mucho']] },
    ],
  },
  {
    id: 203, tipo: 'masiva', origen: 'spe_servicios_2s2025.xlsx', zonas: ['Software y Servicios', 'Otro'], periodo: '2S 2025', registros: 39,
    encuestador: 'Marco Vargas', sede: 'La Paz', fecha: '2026-09-24T12:40:00', evento: 'Encuentro de exportadores',
    resumen: {
      estadisticas: [['Con certificaciones', '12 de 39'], ['Planean nuevos mercados', '25 de 39']],
      grupos: [
        { titulo: 'Encuestas por sector', items: [['Software y Servicios', 27], ['Otro', 12]] },
        { titulo: 'Tamaño de empresa', items: [['Micro', 15], ['Pequeña', 18], ['Mediana', 6]] },
      ],
      alertas: [],
    },
  },
];

// Cada sistema cambia solo la palabra de la columna de zona y el texto del diálogo.
const SISTEMAS = {
  ica: {
    id: 'ica',
    label: 'ICA',
    columnaZona: 'Comunas',
    placeholderBusqueda: 'Buscar por archivo, comuna o encuestador...',
    filtroZona: 'Todas las comunas',
    descripcion: 'Encuestas ICA pendientes de revisión. Al aprobarlas pasan a contar en dashboards, explorador y exportación.',
  },
  spe: {
    id: 'spe',
    label: 'SPE',
    columnaZona: 'Sectores exportadores',
    placeholderBusqueda: 'Buscar por archivo, sector o encuestador...',
    filtroZona: 'Todos los sectores',
    descripcion: 'Registros SPE pendientes de revisión. Al aprobarlos se recalculan los índices del sector.',
  },
};

function formatearFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diasEspera(valor) {
  const ms = Date.now() - new Date(valor).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function Dato({ label, children }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-[#252927]">{children}</dd>
    </div>
  );
}

function Barras({ titulo, items }) {
  const max = Math.max(...items.map(([, n]) => n));
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[#252927]">{titulo}</p>
      <ul className="space-y-1.5">
        {items.map(([label, n]) => (
          <li key={label} className="flex items-center gap-2 text-xs text-[#48504d]">
            <span className="w-32 shrink-0 truncate" title={label}>{label}</span>
            <span className="h-2 flex-1 rounded-full bg-[#f1f3f3]">
              <span className="block h-2 rounded-full bg-[#a00046]" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-8 text-right font-semibold text-[#252927]">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Panel de revisión: todo el flujo ocurre dentro de /aprobaciones (sin navegar al detalle de otra pantalla).
// TODO: los datos de `resumen` / `respuestas` vendrán del backend (ver GET /pendientes o un endpoint de revisión).
function PanelRevision({ registro: r, onClose, onAccion }) {
  const masiva = r.tipo === 'masiva';
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Revisión de carga"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#edf0f1] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${masiva ? 'bg-[#e8f1fb] text-[#2f6fb0]' : 'bg-[#f3ecfb] text-[#7c4dbd]'}`}>
              {masiva ? <Folder size={15} /> : <SquarePen size={15} />}
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#202522]">{r.origen}</h2>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${masiva ? 'text-[#2f6fb0]' : 'text-[#7c4dbd]'}`}>
                {masiva ? 'Carga masiva' : 'Manual'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-[#8a9290] hover:bg-[#f4f6f8] hover:text-[#a00046]">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato label="Encuestador">{r.encuestador}</Dato>
            <Dato label="Sede">{r.sede}</Dato>
            <Dato label="Periodo">{r.periodo}</Dato>
            <Dato label="Fecha de carga">{formatearFecha(r.fecha)}</Dato>
            <Dato label="Evento">{r.evento}</Dato>
            <Dato label="Encuestas">{r.registros}</Dato>
          </dl>

          {masiva ? (
            <>
              <div className="flex flex-wrap gap-2">
                {r.resumen.estadisticas.map(([label, valor]) => (
                  <div key={label} className="rounded-lg bg-[#f4f6f8] px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p>
                    <p className="text-sm font-bold text-[#202522]">{valor}</p>
                  </div>
                ))}
              </div>

              {r.resumen.grupos.map((g) => (
                <Barras key={g.titulo} titulo={g.titulo} items={g.items} />
              ))}

              {r.resumen.alertas.length > 0 ? (
                <div className="rounded-lg border border-[#f3dfb4] bg-[#fbf1de] p-3">
                  <p className="mb-1 text-xs font-bold text-[#b7891e]">Revisar antes de aprobar</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs text-[#8a6a16]">
                    {r.resumen.alertas.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-[#eaf6ef] px-3 py-2 text-xs text-[#2f9e58]">
                  <CheckCircle2 size={14} /> No se detectaron respuestas vacías ni valores raros.
                </p>
              )}
            </>
          ) : (
            r.respuestas.map((g) => (
              <section key={g.grupo}>
                <h3 className="mb-2 text-xs font-bold text-[#252927]">{g.grupo}</h3>
                <dl className="divide-y divide-[#f0f2f2] rounded-lg border border-[#e2e6e8]">
                  {g.items.map(([pregunta, respuesta]) => (
                    <div key={pregunta} className="px-3 py-2">
                      <dt className="text-[11px] text-[#8a9290]">{pregunta}</dt>
                      <dd className="text-xs font-semibold text-[#252927]">{respuesta}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[#edf0f1] px-5 py-3">
          <button
            onClick={() => onAccion(r, 'rechazar')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0c9c4] px-4 py-2 text-xs font-semibold text-[#c0392b] transition hover:bg-[#fdeaea]"
          >
            <X size={13} /> Rechazar
          </button>
          <button
            onClick={() => onAccion(r, 'aprobar')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f9e58] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#268047]"
          >
            <Check size={13} /> Aprobar
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default function AprobacionesPage() {
  const { user } = useAuth();

  // TODO: confirmar cómo expone el rol AuthContext (user.rol / user.role) y cambiar
  // este bloque por <RoleGate> si ya está disponible. SPE es solo Superadmin.
  const rol = String(user?.rol ?? user?.role ?? '').toLowerCase();
  const esSuperadmin = rol === 'superadmin' || rol === 'super_admin';
  // Mientras no se conecte la sesión real, mostramos ambas pestañas para poder diseñar.
  const puedeVerSpe = esSuperadmin || !rol;

  const [sistema, setSistema] = useState('ica');
  const [busqueda, setBusqueda] = useState('');
  const [zona, setZona] = useState('');
  const [sede, setSede] = useState('');

  const [pendientes, setPendientes] = useState({ ica: MOCK_ICA, spe: MOCK_SPE });
  const [accion, setAccion] = useState(null); // { registro, tipo: 'aprobar' | 'rechazar' }
  const [procesando, setProcesando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState(null); // registro abierto en el panel de revisión
  const [aviso, setAviso] = useState('');

  const cfg = SISTEMAS[sistema];
  const lista = pendientes[sistema];

  const zonas = useMemo(() => [...new Set(lista.flatMap((r) => r.zonas))].sort(), [lista]);
  const sedes = useMemo(() => [...new Set(lista.map((r) => r.sede))].sort(), [lista]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((r) => {
      if (zona && !r.zonas.includes(zona)) return false;
      if (sede && r.sede !== sede) return false;
      if (!q) return true;
      return [r.origen, r.zonas.join(' '), r.encuestador].some((campo) => campo.toLowerCase().includes(q));
    });
  }, [lista, busqueda, zona, sede]);

  const masMasAntigua = lista.length ? Math.max(...lista.map((r) => diasEspera(r.fecha))) : 0;
  const totalEncuestas = lista.reduce((suma, r) => suma + r.registros, 0);

  useEffect(() => {
    if (!detalle || accion) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && setDetalle(null);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [detalle, accion]);

  function cambiarSistema(id) {
    setSistema(id);
    setBusqueda('');
    setZona('');
    setSede('');
    setAviso('');
    setDetalle(null);
  }

  async function confirmarAccion() {
    if (!accion) return;
    setProcesando(true);
    // TODO: PATCH /api/{sistema}/cargas/:id/estado con { estado: 'aprobada' | 'rechazada', nota: motivo }
    // (la nota va a data_load.review_note, máx. 255; confirmar el nombre del campo con backend).
    // (status 1 -> 2 o 1 -> 3). Al aprobar, el backend recalcula; puede tardar unos segundos.
    await new Promise((resolver) => setTimeout(resolver, 700));
    const { registro, tipo } = accion;
    setPendientes((prev) => ({ ...prev, [sistema]: prev[sistema].filter((r) => r.id !== registro.id) }));
    setAviso(
      tipo === 'aprobar'
        ? `"${registro.origen}" aprobado. Ya cuenta en los dashboards.`
        : `"${registro.origen}" rechazado. No contará en los dashboards.`,
    );
    setAccion(null);
    setDetalle(null);
    setMotivo('');
    setProcesando(false);
  }

  const cantidad = accion?.registro.registros ?? 0;
  const tarjetas = [
    { label: 'Cargas pendientes', valor: lista.length, Icono: Clock, estilo: 'bg-[#fbf1de] text-[#b7891e]' },
    { label: 'Encuestas por revisar', valor: totalEncuestas, Icono: ShieldCheck, estilo: 'bg-[#fbe9f0] text-[#a00046]' },
    { label: 'Espera más larga', valor: `${masMasAntigua} d`, Icono: Clock, estilo: 'bg-[#e8f1fb] text-[#2f6fb0]' },
  ];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <ConfirmDialog
        open={accion?.tipo === 'aprobar'}
        titulo="¿Aprobar esta carga?"
        mensaje={`Se aprobarán ${cantidad} ${cantidad === 1 ? 'encuesta' : 'encuestas'} de "${accion?.registro.origen}" y se recalcularán los indicadores.`}
        textoConfirmar={procesando ? 'Procesando...' : 'Aprobar'}
        onConfirm={confirmarAccion}
        onCancel={() => !procesando && setAccion(null)}
      />

      {accion?.tipo === 'rechazar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-bold text-[#202522]">¿Rechazar esta carga?</h2>
            <p className="mt-1 text-sm text-[#6d7673]">
              Se rechazarán {cantidad} {cantidad === 1 ? 'encuesta' : 'encuestas'} de "{accion.registro.origen}". No contarán en los dashboards.
            </p>
            <label className="mt-4 block text-xs font-semibold text-[#59615e]">
              Motivo del rechazo <span className="font-normal text-[#8a9290]">(opcional)</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={255}
                rows={3}
                placeholder="Ej.: faltan respuestas en la pregunta 12"
                className="mt-1.5 w-full resize-none rounded-lg border border-[#dfe4e5] px-3 py-2 text-xs font-normal text-[#414845] outline-none focus:border-[#a00046]"
              />
            </label>
            <p className="mt-1 text-right text-[10px] text-[#8a9290]">{motivo.length}/255</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                disabled={procesando}
                onClick={() => { setAccion(null); setMotivo(''); }}
                className="rounded-lg border border-[#dfe4e5] px-4 py-2 text-xs font-semibold text-[#59615e] hover:bg-[#f4f6f8] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={procesando}
                onClick={confirmarAccion}
                className="rounded-lg bg-[#c0392b] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#a53024] disabled:opacity-60"
              >
                {procesando ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <PanelRevision
          registro={detalle}
          onClose={() => setDetalle(null)}
          onAccion={(registro, tipo) => { setMotivo(''); setAccion({ registro, tipo }); }}
        />
      )}

      <div className="mx-auto max-w-[1120px]">
        {/* Encabezado */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Aprobación de encuestas</h1>
          <p className="mt-1 text-sm text-[#6d7673]">{cfg.descripcion}</p>
        </div>

        {/* Tarjetas de resumen (arriba: es lo primero que necesita el revisor) */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tarjetas.map(({ label, valor, Icono, estilo }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${estilo}`}>
                <Icono size={16} />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p>
                <p className="text-xl font-bold text-[#202522]">{valor}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Pestañas + filtros */}
        <section className="mb-5 flex flex-col gap-3 rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm lg:flex-row lg:items-center">
          <div className="inline-flex rounded-lg bg-[#f4f6f8] p-1">
            {Object.values(SISTEMAS)
              .filter((s) => s.id !== 'spe' || puedeVerSpe)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => cambiarSistema(s.id)}
                  className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${sistema === s.id
                    ? 'bg-white text-[#202522] shadow-sm'
                    : 'text-[#8a9290] hover:text-[#59615e]'
                    }`}
                >
                  {s.label}
                  <span className="rounded-full bg-[#fbe9f0] px-1.5 py-0.5 text-[10px] font-bold text-[#a00046]">
                    {pendientes[s.id].length}
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
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
            </div>

            {/* La sede solo tiene sentido para el Superadmin: el Admin ya ve solo la suya. */}
            {(esSuperadmin || !rol) && (
              <div className="relative">
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="appearance-none rounded-lg border border-[#dfe4e5] bg-white py-2 pl-3 pr-8 text-xs font-semibold text-[#59615e] outline-none focus:border-[#a00046]"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a9290]" />
              </div>
            )}

            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9290]" />
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

        {aviso && (
          <p className="mb-5 flex items-center gap-2 rounded-lg bg-[#eaf6ef] px-3 py-2 text-sm text-[#2f9e58]">
            <CheckCircle2 size={15} /> {aviso}
          </p>
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
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#8a9290]">
                      {lista.length === 0
                        ? 'No hay cargas pendientes. Todo está al día.'
                        : 'Ninguna carga coincide con los filtros. Cambia o limpia los filtros para ver más.'}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => {
                    const espera = diasEspera(r.fecha);
                    return (
                      <tr key={r.id} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${r.tipo === 'masiva' ? 'bg-[#e8f1fb] text-[#2f6fb0]' : 'bg-[#f3ecfb] text-[#7c4dbd]'}`}
                            >
                              {r.tipo === 'masiva' ? <Folder size={14} /> : <SquarePen size={14} />}
                            </span>
                            <div>
                              <p className="font-semibold text-[#252927]">{r.origen}</p>
                              <p
                                className={`text-[9px] font-bold uppercase tracking-wider ${r.tipo === 'masiva' ? 'text-[#2f6fb0]' : 'text-[#7c4dbd]'}`}
                              >
                                {r.tipo === 'masiva' ? 'Carga masiva' : 'Manual'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3" title={r.zonas.join(', ')}>
                          {r.zonas.length === 1 ? r.zonas[0] : `${r.zonas.length} ${sistema === 'ica' ? 'comunas' : 'sectores'}`}
                          {r.zonas.length > 1 && (
                            <p className="max-w-[180px] truncate text-[10px] text-[#8a9290]">{r.zonas.join(', ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{r.periodo}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#f1f3f3] px-2 py-1 text-[10px] font-bold text-[#414845]">
                            {r.registros}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#252927]">{r.encuestador}</p>
                          <p className="text-[10px] text-[#8a9290]">Sede {r.sede}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{formatearFecha(r.fecha)}</p>
                          <p className={`text-[10px] ${espera >= 3 ? 'font-semibold text-[#b7891e]' : 'text-[#8a9290]'}`}>
                            {espera === 0 ? 'Hoy' : `Hace ${espera} d`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDetalle(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#dfe4e5] px-2.5 py-1.5 text-[11px] font-semibold text-[#59615e] transition hover:border-[#a00046] hover:text-[#a00046]"
                            >
                              <Eye size={12} /> Revisar
                            </button>
                            <button
                              onClick={() => setAccion({ registro: r, tipo: 'rechazar' })}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#f0c9c4] px-2.5 py-1.5 text-[11px] font-semibold text-[#c0392b] transition hover:bg-[#fdeaea]"
                            >
                              <X size={12} /> Rechazar
                            </button>
                            <button
                              onClick={() => setAccion({ registro: r, tipo: 'aprobar' })}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#2f9e58] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#268047]"
                            >
                              <Check size={12} /> Aprobar
                            </button>
                          </div>
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
                <Loader2 size={12} className="animate-spin" /> Procesando...
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}