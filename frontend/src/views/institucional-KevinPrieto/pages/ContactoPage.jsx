import React, { useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

const FORM_VACIO = { nombre: '', correo: '', institucion: '', sedeId: '', asunto: '', mensaje: '' };

const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/10';
const labelClass = 'mb-1.5 block text-xs font-semibold text-ink/70';

export const ContactoPage = () => {
  const [formData, setFormData] = useState(FORM_VACIO);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Las sedes salen de la BD (no fijas en el código): así el mensaje nunca
  // apunta a una sede que no existe.
  useEffect(() => {
    fetch('/api/contacto/sedes')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setSedes(lista);
        if (lista.length === 1) {
          setFormData((actual) => ({ ...actual, sedeId: String(lista[0].id) }));
        }
      })
      .catch(() => setSedes([]));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        setFeedback({ type: 'success', message: 'Mensaje enviado correctamente al administrador de la sede.' });
        setFormData({ ...FORM_VACIO, sedeId: sedes.length === 1 ? String(sedes[0].id) : '' });
      } else {
        setFeedback({ type: 'error', message: data.error || data.message || 'Ocurrió un error al enviar el mensaje.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo conectar con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">Contacto</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Contáctanos</h1>
        <p className="mt-2 text-sm text-ink/60">
          Si tienes alguna consulta, sugerencia o comentario, escribinos: tu mensaje le llega al administrador de la
          sede que elijas.
        </p>

        {feedback.message && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`mt-5 rounded-lg border px-3 py-2.5 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contacto-nombre" className={labelClass}>Nombre</label>
              <input id="contacto-nombre" type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="contacto-correo" className={labelClass}>Correo electrónico</label>
              <input id="contacto-correo" type="email" name="correo" value={formData.correo} onChange={handleChange} required className={inputClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contacto-institucion" className={labelClass}>
                Institución <span className="font-normal text-ink/40">(opcional)</span>
              </label>
              <input id="contacto-institucion" type="text" name="institucion" value={formData.institucion} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label htmlFor="contacto-sede" className={labelClass}>Sede</label>
              <select id="contacto-sede" name="sedeId" value={formData.sedeId} onChange={handleChange} required className={inputClass}>
                <option value="" disabled>Seleccioná una sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="contacto-asunto" className={labelClass}>Asunto</label>
            <input id="contacto-asunto" type="text" name="asunto" value={formData.asunto} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label htmlFor="contacto-mensaje" className={labelClass}>Mensaje</label>
            <textarea id="contacto-mensaje" name="mensaje" rows="5" value={formData.mensaje} onChange={handleChange} required className={`${inputClass} resize-y`} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-maroon px-5 py-3 text-sm font-semibold text-white transition hover:bg-maroon-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default ContactoPage;
