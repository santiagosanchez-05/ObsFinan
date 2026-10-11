import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Save } from 'lucide-react';
import { SPE_SECTIONS } from '../spe.questions';
import { useAuth } from '../../../shared/AuthContext';
import { periodoDelEvento } from '../../encuestador/useEventoEncuesta';

const INPUT_CLASS = 'w-full rounded-lg border border-line bg-card px-3 py-2.5 text-xs text-ink-2 outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand-line';
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

const CAMPO_POR_NOMBRE = Object.fromEntries(
  SPE_SECTIONS.flatMap((seccion) => seccion.fields.map((field) => [field.name, field])),
);

// Un campo con showIf (ej. "¿Qué otro sector?") solo aparece si se cumple.
const esVisible = (field, valores) => !field.showIf || field.showIf(valores);

// Solo se envían los campos visibles: si cambió "Otro" por otra opción, el
// texto que había escrito no viaja al backend.
function armarPayload(valores, evento) {
  // Desde un evento (encuestador) el período lo pone el backend con la fecha del evento.
  const payload = evento ? { eventId: evento.id } : { year: valores.year, semester: valores.semester };
  SPE_SECTIONS.forEach((seccion) => {
    seccion.fields.forEach((field) => {
      if (esVisible(field, valores) && valores[field.name] !== undefined) payload[field.name] = valores[field.name];
    });
  });
  return payload;
}

function obtenerDetallesErrores(errores) {
  return Object.entries(errores)
    .map(([campo, mensajes]) => ({
      campo,
      sectionIndex: CAMPOS_SPE[campo]?.sectionIndex ?? 0,
    }))
    .filter(({ campo }) => campo !== '_errors');
}

// Sin `evento`: registro del Superadmin (US37, entra aprobado).
// Con `evento`: encuesta del encuestador desde Mis eventos (US66, entra pendiente).
export default function RegistrarSpePage({ evento = null }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const section = SPE_SECTIONS[sectionIndex];
  const periodoEvento = evento ? periodoDelEvento(evento.fecha) : null;
  const volverA = evento ? { to: '/encuestador/eventos', texto: 'Volver a mis eventos' } : { to: '/spe', texto: 'Volver al Dashboard SPE' };

  function cambiarValor(name, value) {
    setSaved(false);
    setError('');
    setValues((current) => ({ ...current, [name]: value }));
  }

  // "Ninguno" excluye a las demás opciones y `max` limita cuántas se marcan.
  function cambiarCheckbox(name, option) {
    const current = values[name] || [];
    if (current.includes(option)) {
      cambiarValor(name, current.filter((item) => item !== option));
      return;
    }
    if (option === 'Ninguno') {
      cambiarValor(name, ['Ninguno']);
      return;
    }
    const sinNinguno = current.filter((item) => item !== 'Ninguno');
    const max = CAMPO_POR_NOMBRE[name]?.max;
    if (max && sinNinguno.length >= max) return;
    cambiarValor(name, [...sinNinguno, option]);
  }

  async function guardarRegistro(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(evento ? '/api/spe/encuestas' : '/api/spe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(armarPayload(values, evento)),
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

  function registrarOtra() {
    setValues(INITIAL_VALUES);
    setSectionIndex(0);
    setSaved(false);
  }

  if (evento && saved) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-xl border border-line bg-card p-8 text-center shadow-sm">
          <CheckCircle2 size={40} className="mx-auto text-[#3c8d66]" />
          <h1 className="mt-3 text-xl font-bold text-ink">Encuesta enviada</h1>
          <p className="mt-2 text-sm text-muted">La encuesta SPE se guardó y quedó pendiente de aprobación del Superadmin.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={registrarOtra} className="rounded-lg border border-brand-line bg-card px-4 py-2.5 text-xs font-semibold text-brand hover:bg-brand-soft">Registrar otra encuesta</button>
            <Link to="/encuestador/eventos" className="rounded-lg bg-maroon px-4 py-2.5 text-xs font-semibold text-white hover:bg-maroon-dark">Volver a mis eventos</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Link to={volverA.to} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"><ArrowLeft size={14} /> {volverA.texto}</Link>
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand"><span className="h-1.5 w-1.5 rounded-full bg-maroon" /> {evento ? 'Encuesta de campo' : 'Registro individual'}</div><h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{evento ? 'Registrar encuesta SPE' : 'Registrar nuevo registro SPE'}</h1><p className="mt-1 text-sm text-muted">Encuesta única integrada SOCOMEX - SOCIFIN</p></div>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-[11px] text-ink-2"><ClipboardCheck size={15} className="text-brand" /> {evento ? 'Quedará pendiente de aprobación' : 'Se guardará como aprobado'}</div>
        </header>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-xl border border-line bg-card p-3 shadow-sm lg:sticky lg:top-5"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Secciones del instrumento</p><nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{SPE_SECTIONS.map((item, index) => <button key={item.id} type="button" onClick={() => setSectionIndex(index)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${sectionIndex === index ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-subtle'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${sectionIndex === index ? 'bg-maroon text-white' : 'bg-subtle text-muted'}`}>{item.number}</span><span className="text-xs font-semibold leading-tight">{item.title}</span></button>)}</nav><div className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">Los campos se conservan mientras avanzas entre secciones.</div></aside>
          <form onSubmit={guardarRegistro} className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
            <div className="border-b border-line px-5 py-4 sm:px-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Sección {section.number} de {SPE_SECTIONS.length}</p><h2 className="mt-1 text-lg font-bold text-ink">{section.title}</h2><p className="mt-1 text-xs text-muted">{section.description}</p></div><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand sm:flex"><ClipboardCheck size={18} /></span></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-maroon transition-all" style={{ width: `${((sectionIndex + 1) / SPE_SECTIONS.length) * 100}%` }} /></div></div>
            {sectionIndex === 0 && evento && <div className="border-b border-line bg-subtle px-5 py-4 text-xs text-muted sm:px-7"><span className="block text-[11px] font-bold text-ink-2">Evento</span><span className="block font-semibold text-ink">{evento.titulo}</span>Período: Semestre {periodoEvento?.semester} · {periodoEvento?.year} (según la fecha del evento)</div>}
            {sectionIndex === 0 && !evento && <div className="border-b border-line bg-subtle px-5 py-4 sm:px-7"><Field label="Periodo" required><div className="grid max-w-md grid-cols-2 gap-2"><select value={values.semester} onChange={(event) => cambiarValor('semester', event.target.value)} className={INPUT_CLASS}><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select><input value={values.year} onChange={(event) => cambiarValor('year', event.target.value)} type="number" className={INPUT_CLASS} aria-label="Año" /></div></Field></div>}
            <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">{section.fields.filter((field) => esVisible(field, values)).map((field) => <Question key={field.name} field={field} value={values[field.name]} onChange={cambiarValor} onToggle={cambiarCheckbox} />)}</div>
            <footer className="flex flex-col-reverse gap-3 border-t border-line bg-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div>{saved && <p className="flex items-center gap-1.5 text-xs font-semibold text-[#32845d]"><Check size={15} /> Registro guardado correctamente.</p>}{error && <p className="text-xs font-semibold text-[#b42318]">{error}</p>}</div><div className="flex justify-end gap-2"><button type="button" disabled={sectionIndex === 0 || saving} onClick={() => setSectionIndex((index) => index - 1)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Anterior</button>{sectionIndex < SPE_SECTIONS.length - 1 ? <button type="button" disabled={saving} onClick={() => setSectionIndex((index) => index + 1)} className="inline-flex items-center gap-1 rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white hover:bg-maroon-dark disabled:opacity-50">Siguiente <ChevronRight size={14} /></button> : <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-maroon px-4 py-2 text-xs font-semibold text-white hover:bg-maroon-dark disabled:opacity-50"><Save size={14} /> {saving ? 'Guardando...' : 'Guardar registro'}</button>}</div></footer>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, children }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-ink-2">{label}{required && <span className="ml-1 text-brand">*</span>}</span>{children}</label>; }

function Question({ field, value, onChange, onToggle }) {
  if (field.type === 'scale') return <fieldset><legend className="mb-2 text-[11px] font-bold text-ink-2">{field.label}</legend><div className="grid grid-cols-5 gap-1.5">{[1, 2, 3, 4, 5].map((option) => <label key={option} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] transition ${String(value) === String(option) ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:border-brand-line'}`}><input type="radio" name={field.name} value={option} checked={String(value) === String(option)} onChange={(event) => onChange(field.name, event.target.value)} className="sr-only" />{option}<span className="text-[9px]">{option === 1 ? 'Bajo' : option === 5 ? 'Alto' : ''}</span></label>)}</div></fieldset>;
  if (field.type === 'radio') return <fieldset><legend className="mb-2 text-[11px] font-bold text-ink-2">{field.label}</legend><div className="flex flex-wrap gap-2">{field.options.map((option) => <label key={option} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${value === option ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line text-ink-2'}`}><input type="radio" name={field.name} value={option} checked={value === option} onChange={() => onChange(field.name, option)} className="accent-maroon" />{option}</label>)}</div></fieldset>;
  if (field.type === 'checkbox') return <fieldset className="sm:col-span-2"><legend className="mb-2 text-[11px] font-bold text-ink-2">{field.label}</legend><div className="grid gap-2 sm:grid-cols-2">{field.options.map((option) => { const marcadas = (value || []).filter((item) => item !== 'Ninguno'); const bloqueada = Boolean(field.max) && !(value || []).includes(option) && option !== 'Ninguno' && marcadas.length >= field.max; return <label key={option} className={`flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-xs text-ink-2 ${bloqueada ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-brand-line'}`}><input type="checkbox" checked={(value || []).includes(option)} disabled={bloqueada} onChange={() => onToggle(field.name, option)} className="accent-maroon" />{option}</label>; })}</div></fieldset>;
  if (field.type === 'select') return <Field label={field.label}><select value={value || ''} onChange={(event) => onChange(field.name, event.target.value)} className={INPUT_CLASS}><option value="">Seleccione una opción</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>;
  return <Field label={field.label}><input type={field.type} value={value || ''} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} className={INPUT_CLASS} /></Field>;
}
