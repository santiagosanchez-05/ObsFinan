import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConvocatoriasPage from './ConvocatoriasPage';
import { AuthProvider } from '../../../shared/AuthContext';

const CONVOCATORIAS_MOCK = [
  {
    id: 1,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Convocatoria Abierta CBBA',
    descripcion: 'Búsqueda activa de encuestadores',
    fechaInicio: '2026-03-01',
    fechaFin: '2026-03-31',
    estaAbierta: true,
    estado: 'abierta',
    totalPostulantes: 8,
  },
  {
    id: 2,
    campusId: 2,
    sede: 'La Paz',
    titulo: 'Convocatoria Pasada LPZ',
    descripcion: 'Convocatoria finalizada',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-01-31',
    estaAbierta: false,
    estado: 'cerrada',
    totalPostulantes: 15,
  },
];

describe('ConvocatoriasPage (US51 — Listado de convocatorias)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra loader y luego las tarjetas de convocatorias', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CONVOCATORIAS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ConvocatoriasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/cargando convocatorias/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Convocatoria Abierta CBBA')).toBeInTheDocument();
      expect(screen.getByText('Convocatoria Pasada LPZ')).toBeInTheDocument();
      expect(screen.getByText('8 postulantes')).toBeInTheDocument();
      expect(screen.getByText('15 postulantes')).toBeInTheDocument();
    });
  });

  it('filtra convocatorias por estado (abiertas / cerradas)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CONVOCATORIAS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ConvocatoriasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Convocatoria Abierta CBBA')).toBeInTheDocument();
    });

    const botonAbiertas = screen.getByRole('button', { name: /abiertas/i });
    fireEvent.click(botonAbiertas);

    expect(screen.getByText('Convocatoria Abierta CBBA')).toBeInTheDocument();
    expect(screen.queryByText('Convocatoria Pasada LPZ')).not.toBeInTheDocument();

    const botonCerradas = screen.getByRole('button', { name: /cerradas/i });
    fireEvent.click(botonCerradas);

    expect(screen.queryByText('Convocatoria Abierta CBBA')).not.toBeInTheDocument();
    expect(screen.getByText('Convocatoria Pasada LPZ')).toBeInTheDocument();
  });

  it('muestra estado vacío si no hay convocatorias', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ConvocatoriasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no hay convocatorias disponibles/i)).toBeInTheDocument();
    });
  });
});
