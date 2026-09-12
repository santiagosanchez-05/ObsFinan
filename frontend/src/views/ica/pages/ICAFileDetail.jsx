import { Link } from 'react-router-dom';
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
} from 'lucide-react';

// Datos estáticos 
const archivo = {
  nombre: 'ica_comunas_q3_2026.xlsx',
  descripcion: 'Archivo Excel de Indicadores de Calidad de Vida',
  fechaCarga: '15 de Octubre, 2026',
  subidoPor: 'Admin Univalle',
  totalRegistros: 6,
  estado: 'Verificado',
};

const registros = [
  { comuna: 'Adela Zamudio', periodo: 'Q3 2026', conocimiento: 64.5, uso: 79.9, educacion: 56.8, prevision: 68.8, hombres: 69.5, mujeres: 65.5 },
  { comuna: 'Itocta', periodo: 'Q3 2026', conocimiento: 54.2, uso: 71.2, educacion: 58.6, prevision: 65.6, hombres: 61.5, mujeres: 63.3 },
  { comuna: 'Molle', periodo: 'Q3 2026', conocimiento: 57.8, uso: 71.9, educacion: 53.7, prevision: 67.1, hombres: 61.4, mujeres: 63.9 },
  { comuna: 'Tunari', periodo: 'Q3 2026', conocimiento: 53.4, uso: 71.5, educacion: 48.5, prevision: 66.4, hombres: 59.6, mujeres: 60.3 },
  { comuna: 'Valle Hermoso', periodo: 'Q3 2026', conocimiento: 58.4, uso: 74.6, educacion: 52.2, prevision: 62.0, hombres: 65.3, mujeres: 58.3 },
  { comuna: 'Alejo Calatayud', periodo: 'Q3 2026', conocimiento: 55.0, uso: 72.4, educacion: 52.3, prevision: 67.6, hombres: 64.0, mujeres: 59.6 },
];

export default function ICAFileDetail() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        {/* Breadcrumb */}
        <Link
          to="/ica/historial"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"
        >
          <ArrowLeft size={13} /> Volver al Historial
        </Link>

        {/* Encabezado */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Detalle de archivo</h1>
          <button className="inline-flex items-center gap-2 self-start rounded-lg border border-[#f0b9c7] bg-[#fff5f7] px-4 py-2 text-xs font-semibold text-[#a00046] transition hover:bg-[#fde8ee] sm:self-auto">
            <Trash2 size={14} /> Eliminar archivo
          </button>
        </div>

        {/* Tarjeta de metadatos del archivo */}
        <section className="mb-5 rounded-xl border border-[#e2e6e8] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e5f5ea] text-[#2f9e58]">
                <FileSpreadsheet size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#252927]">{archivo.nombre}</p>
                <p className="mt-0.5 text-xs text-[#8a9290]">{archivo.descripcion}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:pl-6 lg:border-l lg:border-[#edf0f1]">
              <MetaItem label="Fecha de carga" value={archivo.fechaCarga} />
              <MetaItem label="Subido por" value={archivo.subidoPor} />
              <MetaItem label="Total registros" value={`${archivo.totalRegistros} registros`} />
              <div>
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">Estado</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6ef] px-2 py-1 text-[10px] font-bold text-[#2f9e58]">
                  <CheckCircle2 size={11} /> {archivo.estado}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tabla de contenido del archivo */}
        <section className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf0f1] px-4 py-4">
            <h2 className="text-sm font-bold text-[#252927]">Contenido del archivo</h2>
            <div className="flex items-center gap-3 text-[#8a9290]">
              <button className="hover:text-[#a00046]"><Search size={14} /></button>
              <button className="hover:text-[#a00046]"><Filter size={14} /></button>
              <button className="hover:text-[#a00046]"><Download size={14} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-[#fafbfb] text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">
                <tr>
                  <th className="px-4 py-3">Comuna</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Conocimiento</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Educación</th>
                  <th className="px-4 py-3">Previsión</th>
                  <th className="px-4 py-3">ICA hombres</th>
                  <th className="px-4 py-3">ICA mujeres</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.comuna} className="border-t border-[#f0f2f2] text-[#48504d] hover:bg-[#fff8fa]">
                    <td className="px-4 py-3 font-semibold text-[#252927]">{r.comuna}</td>
                    <td className="px-4 py-3 text-[#8a9290]">{r.periodo}</td>
                    <td className="px-4 py-3">{r.conocimiento}</td>
                    <td className="px-4 py-3">{r.uso}</td>
                    <td className="px-4 py-3">{r.educacion}</td>
                    <td className="px-4 py-3">{r.prevision}</td>
                    <td className="px-4 py-3 font-semibold text-[#a00046]">{r.hombres}</td>
                    <td className="px-4 py-3 font-semibold text-[#a00046]">{r.mujeres}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button className="text-[#8a9290] hover:text-[#a00046]"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#edf0f1] px-4 py-3 text-[10px] text-[#8a9290]">
            <span>Mostrando {registros.length} registros del archivo</span>
            <div className="flex items-center gap-1.5">
              <button disabled className="rounded border border-[#e4e8e8] px-3 py-1.5 font-semibold text-[#59615e] disabled:opacity-50">Anterior</button>
              <button className="rounded bg-[#a00046] px-3 py-1.5 font-semibold text-white">1</button>
              <button className="rounded border border-[#e4e8e8] px-3 py-1.5 font-semibold text-[#59615e] hover:border-[#a00046]">Siguiente</button>
            </div>
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
            description="Calculado en base a los 6 registros de este período."
          />
          <SummaryCard
            icon={<Users size={16} />}
            iconClass="bg-[#f6ecfb] text-[#a34fc4]"
            label="Brecha de género"
            value="3.4%"
            suffix="Diferencia H/M"
            description="El índice en hombres es superior al de mujeres en este lote."
          />
          <article className="flex items-start gap-3 rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fbf1de] text-[#b7891e]">
              <Info size={16} />
            </span>
            <div>
              <p className="text-xs font-bold text-[#252927]">Vista de revisión</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8a9290]">
                Este es un reporte consolidado. Los cambios realizados aquí se verán reflejados en los tableros generales del ICA.
              </p>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</span>
      <p className="text-xs font-semibold text-[#414845]">{value}</p>
    </div>
  );
}

function SummaryCard({ icon, iconClass, label, value, suffix, description }) {
  return (
    <article className="rounded-xl border border-[#e4e8e9] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9290]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#a00046]">
        {value} <span className="text-sm font-semibold text-[#252927]">{suffix}</span>
      </p>
      <p className="mt-2 text-[11px] text-[#8a9290]">{description}</p>
    </article>
  );
}