import React, { useState } from 'react';

export const ContactoPage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    sedeId: '1',
    asunto: '',
    mensaje: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:3000/api/contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: 'Mensaje enviado correctamente al administrador de la sede.'
        });
        setFormData({ nombre: '', correo: '', sedeId: '1', asunto: '', mensaje: '' });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Ocurrió un error al enviar el mensaje.'
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'No se pudo conectar con el servidor.'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none'
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Contáctanos</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Si tienes alguna consulta, sugerencia o comentario, puedes comunicarte con nosotros mediante este formulario.
      </p>

      {feedback.message && (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
          color: feedback.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${feedback.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Correo electrónico:</label>
          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sede:</label>
          <select
            name="sedeId"
            value={formData.sedeId}
            onChange={handleChange}
            required
            style={{ ...inputStyle, backgroundColor: '#fff' }}
          >
            <option value="1">Cochabamba</option>
            <option value="2">La Paz</option>
            <option value="3">Santa Cruz</option>
            <option value="4">Sucre</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Asunto:</label>
          <input
            type="text"
            name="asunto"
            value={formData.asunto}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mensaje:</label>
          <textarea
            name="mensaje"
            rows="5"
            value={formData.mensaje}
            onChange={handleChange}
            required
            style={{ ...inputStyle, resize: 'vertical' }}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Enviando...' : 'Enviar mensaje'}
        </button>
      </form>
    </div>
  );
};

export default ContactoPage;