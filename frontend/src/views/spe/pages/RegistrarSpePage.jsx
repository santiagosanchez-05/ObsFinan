import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardCheck, Save } from 'lucide-react';
import { SPE_SECTIONS } from '../spe.questions';
import { useAuth } from '../../../shared/AuthContext';

const INPUT_CLASS = 'w-full rounded-lg border border-[#dfe4e5] bg-white px-3 py-2.5 text-xs text-[#414845] outline-none placeholder:text-[#adb5b2] focus:border-[#a00046] focus:ring-2 focus:ring-[#f7eaf0]';
const INITIAL_VALUES = { year: '2026', semester: '2' };

const CAMPOS_GENERALES = {
  year: 'Año',
  semester: 'Semestre',
};

const CAMPOS_SPE = SPE_SECTIONS.reduce((campos, currentSection, index) => {
  currentSection.fields.forEach((field) => {
    campos[field.name] = { sectionIndex: index };
  });
  return campos;
}, CAMPOS_GENERALES);

function obtenerDetallesErrores(errores) {
  return Object.entries(errores)
    .map(([campo, mensajes]) => ({
      campo,
      sectionIndex: CAMPOS_SPE[campo]?.sectionIndex ?? 0,
    }))
    .filter(({ campo }) => campo !== '_errors');
}

export default function RegistrarSpePage() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const section = SPE_SECTIONS[sectionIndex];

  function cambiarValor(name, value) {
    setSaved(false);
    setError('');
    setValues((current) => ({ ...current, [name]: value }));
  }

  function cambiarCheckbox(name, option) {
    const current = values[name] || [];
    cambiarValor(name, current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  }

  async function guardarRegistro(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/spe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errores = body.detalles?.fieldErrors || {};
        const detallesErrores = obtenerDetallesErrores(errores);
        if (detallesErrores.length) {
          setSectionIndex(detallesErrores[0].sectionIndex);
          const seccionesPendientes = [...new Set(
            detallesErrores.map(({ sectionIndex }) => SPE_SECTIONS[sectionIndex].title),
          )];
          throw new Error(
            `Completa los campos faltantes en: ${seccionesPendientes.join(', ')}.`,
          );
        }
        throw new Error(body.error || 'No se pudo guardar el registro SPE.');
      }
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f6f8] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Link to="/spe" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a00046] hover:underline"><ArrowLeft size={14} /> Volver al Dashboard SPE</Link>
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7eaf0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a00046]"><span className="h-1.5 w-1.5 rounded-full bg-[#a00046]" /> Registro individual</div><h1 className="text-2xl font-bold tracking-tight text-[#202522] sm:text-[28px]">Registrar nuevo registro SPE</h1><p className="mt-1 text-sm text-[#6d7673]">Encuesta única integrada SOCOMEX - SOCIFIN</p></div>
          <div className="flex items-center gap-2 rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-[11px] text-[#68716e]"><ClipboardCheck size={15} className="text-[#a00046]" /> Se guardará como aprobado</div>
        </header>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-xl border border-[#e2e6e8] bg-white p-3 shadow-sm lg:sticky lg:top-5"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a9290]">Secciones del instrumento</p><nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{SPE_SECTIONS.map((item, index) => <button key={item.id} type="button" onClick={() => setSectionIndex(index)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${sectionIndex === index ? 'bg-[#fff3f7] text-[#a00046]' : 'text-[#65706c] hover:bg-[#f6f8f9]'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${sectionIndex === index ? 'bg-[#a00046] text-white' : 'bg-[#eef1f3] text-[#7c8682]'}`}>{item.number}</span><span className="text-xs font-semibold leading-tight">{item.title}</span></button>)}</nav><div className="mt-4 border-t border-[#edf0f1] pt-3 text-[10px] leading-relaxed text-[#8a9290]">Los campos se conservan mientras avanzas entre secciones.</div></aside>
          <form onSubmit={guardarRegistro} className="overflow-hidden rounded-xl border border-[#e2e6e8] bg-white shadow-sm">
            <div className="border-b border-[#edf0f1] px-5 py-4 sm:px-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a00046]">Sección {section.number} de {SPE_SECTIONS.length}</p><h2 className="mt-1 text-lg font-bold text-[#252927]">{section.title}</h2><p className="mt-1 text-xs text-[#737b78]">{section.description}</p></div><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7eaf0] text-[#a00046] sm:flex"><ClipboardCheck size={18} /></span></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-[#edf0f1]"><div className="h-full rounded-full bg-[#a00046] transition-all" style={{ width: `${((sectionIndex + 1) / SPE_SECTIONS.length) * 100}%` }} /></div></div>
            {sectionIndex === 0 && <div className="border-b border-[#edf0f1] bg-[#fafbfc] px-5 py-4 sm:px-7"><Field label="Periodo" required><div className="grid max-w-md grid-cols-2 gap-2"><select value={values.semester} onChange={(event) => cambiarValor('semester', event.target.value)} className={INPUT_CLASS}><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select><input value={values.year} onChange={(event) => cambiarValor('year', event.target.value)} type="number" className={INPUT_CLASS} aria-label="Año" /></div></Field></div>}
            <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">{section.fields.map((field) => <Question key={field.name} field={field} value={values[field.name]} onChange={cambiarValor} onToggle={cambiarCheckbox} />)}</div>
            <footer className="flex flex-col-reverse gap-3 border-t border-[#edf0f1] bg-[#fafbfc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div>{saved && <p className="flex items-center gap-1.5 text-xs font-semibold text-[#32845d]"><Check size={15} /> Registro guardado correctamente.</p>}{error && <p className="text-xs font-semibold text-[#b42318]">{error}</p>}</div><div className="flex justify-end gap-2"><button type="button" disabled={sectionIndex === 0 || saving} onClick={() => setSectionIndex((index) => index - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#dfe4e5] bg-white px-3 py-2 text-xs font-semibold text-[#68716e] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Anterior</button>{sectionIndex < SPE_SECTIONS.length - 1 ? <button type="button" disabled={saving} onClick={() => setSectionIndex((index) => index + 1)} className="inline-flex items-center gap-1 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d0035] disabled:opacity-50">Siguiente <ChevronRight size={14} /></button> : <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#a00046] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d0035] disabled:opacity-50"><Save size={14} /> {saving ? 'Guardando...' : 'Guardar registro'}</button>}</div></footer>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, children }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#414845]">{label}{required && <span className="ml-1 text-[#a00046]">*</span>}</span>{children}</label>; }

function Question({ field, value, onChange, onToggle }) {
  if (field.type === 'scale') return <fieldset><legend className="mb-2 text-[11px] font-bold text-[#414845]">{field.label}</legend><div className="grid grid-cols-5 gap-1.5">{[1, 2, 3, 4, 5].map((option) => <label key={option} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] transition ${String(value) === String(option) ? 'border-[#a00046] bg-[#fff3f7] text-[#a00046]' : 'border-[#e5e9ea] text-[#7a8581] hover:border-[#d6a4b7]'}`}><input type="radio" name={field.name} value={option} checked={String(value) === String(option)} onChange={(event) => onChange(field.name, event.target.value)} className="sr-only" />{option}<span className="text-[9px]">{option === 1 ? 'Bajo' : option === 5 ? 'Alto' : ''}</span></label>)}</div></fieldset>;
  if (field.type === 'radio') return <fieldset><legend className="mb-2 text-[11px] font-bold text-[#414845]">{field.label}</legend><div className="flex flex-wrap gap-2">{field.options.map((option) => <label key={option} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${value === option ? 'border-[#a00046] bg-[#fff3f7] font-semibold text-[#a00046]' : 'border-[#e5e9ea] text-[#65706c]'}`}><input type="radio" name={field.name} value={option} checked={value === option} onChange={() => onChange(field.name, option)} className="accent-[#a00046]" />{option}</label>)}</div></fieldset>;
  if (field.type === 'checkbox') return <fieldset className="sm:col-span-2"><legend className="mb-2 text-[11px] font-bold text-[#414845]">{field.label}</legend><div className="grid gap-2 sm:grid-cols-2">{field.options.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e5e9ea] px-3 py-2.5 text-xs text-[#65706c] hover:border-[#d6a4b7]"><input type="checkbox" checked={(value || []).includes(option)} onChange={() => onToggle(field.name, option)} className="accent-[#a00046]" />{option}</label>)}</div></fieldset>;
  if (field.type === 'select') return <Field label={field.label}><select value={value || ''} onChange={(event) => onChange(field.name, event.target.value)} className={INPUT_CLASS}><option value="">Seleccione una opción</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>;
  return <Field label={field.label}><input type={field.type} value={value || ''} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} className={INPUT_CLASS} /></Field>;
}
