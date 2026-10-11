import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import EncuestaSpePage from './EncuestaSpePage';

const EVENTO = { id: 5, titulo: 'Feria exportadora', fecha: '2026-10-15', hasIca: false, hasSpe: true };

function renderPage() {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 9, nombre: 'Pedro', role: 'encuestador', campusId: 1 } }));
  render(
    <MemoryRouter initialEntries={['/encuestador/eventos/5/spe']}>
      <AuthProvider>
        <Routes>
          <Route path="/encuestador/eventos/:eventId/spe" element={<EncuestaSpePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('EncuestaSpePage (US66)', () => {
  beforeEach(() => localStorage.clear());

  it('muestra el evento y su período, y envía la encuesta con eventId y sin período', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => EVENTO })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dataLoadId: 1 }) });
    renderPage();

    expect(await screen.findByText('Feria exportadora')).toBeInTheDocument();
    expect(screen.getByText(/Semestre 2 · 2026/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Año')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Inversión y perspectiva futura/ }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar registro/ }));

    await waitFor(() => expect(screen.getByText('Encuesta enviada')).toBeInTheDocument());
    const [url, opciones] = global.fetch.mock.calls[1];
    expect(url).toBe('/api/spe/encuestas');
    const enviado = JSON.parse(opciones.body);
    expect(enviado.eventId).toBe(5);
    expect(enviado).not.toHaveProperty('year');
    expect(enviado).not.toHaveProperty('semester');
  });

  it('si el evento no habilita SPE no muestra el formulario', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ...EVENTO, hasSpe: false }) });
    renderPage();
    expect(await screen.findByText('Este evento no habilita la encuesta SPE.')).toBeInTheDocument();
  });
});
