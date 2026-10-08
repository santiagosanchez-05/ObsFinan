import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostularPage from './PostularPage';
import { AuthProvider } from '../../../shared/AuthContext';

const ABIERTAS_MOCK = [
  {
    id: 1,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Convocatoria Abierta CBBA',
    descripcion: 'Búsqueda activa de encuestadores',
    fechaInicio: '2026-03-01',
    fechaFin: '2026-03-31',
  },
];

describe('PostularPage (US52 — Postulación pública)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carga convocatorias abiertas y muestra el formulario de postulación', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ABIERTAS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <PostularPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/buscando convocatorias/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/convocatoria a la que postulas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nombres/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/apellido paterno/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono \/ celular/i)).toBeInTheDocument();
    });
  });

  it('muestra estado sin convocatorias si no hay ninguna abierta', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <PostularPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no hay convocatorias vigentes/i)).toBeInTheDocument();
    });
  });

  it('envía la postulación correctamente y muestra la pantalla de éxito', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Postulación registrada con éxito', applicantId: 101 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(ABIERTAS_MOCK),
      });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <PostularPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nombres/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/nombres/i), { target: { value: 'Carlos' } });
    fireEvent.change(screen.getByLabelText(/apellido paterno/i), { target: { value: 'Suárez' } });
    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'carlos@test.bo' } });
    fireEvent.change(screen.getByLabelText(/teléfono \/ celular/i), { target: { value: '71234567' } });

    fireEvent.click(screen.getByRole('button', { name: /enviar mi postulación/i }));

    await waitFor(() => {
      expect(screen.getByText(/¡postulación recibida con éxito!/i)).toBeInTheDocument();
      expect(screen.getByText(/identificador de registro: #101/i)).toBeInTheDocument();
    });
  });
});
