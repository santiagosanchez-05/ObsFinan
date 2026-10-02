import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MisEncuestasPage from './MisEncuestasPage';
import { AuthProvider } from '../../../shared/AuthContext';

const MIS_ENCUESTAS_MOCK = [
  {
    id: 1,
    modulo: 'ICA',
    tipoCarga: 'individual',
    nombre: 'Entrevista ICA - Q2 2026',
    totalRegistros: 1,
    status: 1,
    estado: 'pendiente',
    fechaCarga: '2026-04-01T10:00:00.000Z',
    fechaRevision: null,
    revisadoPor: null,
    motivoRechazo: null,
  },
  {
    id: 2,
    modulo: 'SPE',
    tipoCarga: 'individual',
    nombre: 'Encuesta SPE Empresa ABC',
    totalRegistros: 1,
    status: 2,
    estado: 'aprobada',
    fechaCarga: '2026-04-02T12:00:00.000Z',
    fechaRevision: '2026-04-03T15:00:00.000Z',
    revisadoPor: 'Santiago Admin',
    motivoRechazo: null,
  },
  {
    id: 3,
    modulo: 'ICA',
    tipoCarga: 'archivo',
    nombre: 'Lote encuestas abril.xlsx',
    totalRegistros: 20,
    status: 3,
    estado: 'rechazada',
    fechaCarga: '2026-04-03T08:00:00.000Z',
    fechaRevision: '2026-04-04T09:00:00.000Z',
    revisadoPor: 'Ana Revisor',
    motivoRechazo: 'Datos incompletos en la sección de ingresos familiares',
  },
];

describe('MisEncuestasPage (US61 — Estado de mis encuestas)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carga y muestra las encuestas distinguiendo pendiente, aprobada y rechazada', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MIS_ENCUESTAS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MisEncuestasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/consultando estado de tus encuestas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Entrevista ICA - Q2 2026')).toBeInTheDocument();
      expect(screen.getByText('Encuesta SPE Empresa ABC')).toBeInTheDocument();
      expect(screen.getByText('Lote encuestas abril.xlsx')).toBeInTheDocument();

      // Badges
      expect(screen.getByText(/^pendiente$/i)).toBeInTheDocument();
      expect(screen.getByText(/^aprobada$/i)).toBeInTheDocument();
      expect(screen.getByText(/^rechazada$/i)).toBeInTheDocument();

      // Motivo de rechazo
      expect(
        screen.getByText('Datos incompletos en la sección de ingresos familiares')
      ).toBeInTheDocument();
    });
  });

  it('permite filtrar por estado (aprobadas)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MIS_ENCUESTAS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MisEncuestasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Entrevista ICA - Q2 2026')).toBeInTheDocument();
    });

    const botonAprobadas = screen.getByRole('button', { name: /aprobadas/i });
    fireEvent.click(botonAprobadas);

    expect(screen.getByText('Encuesta SPE Empresa ABC')).toBeInTheDocument();
    expect(screen.queryByText('Entrevista ICA - Q2 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Lote encuestas abril.xlsx')).not.toBeInTheDocument();
  });

  it('muestra mensaje cuando el encuestador no tiene encuestas', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MisEncuestasPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no hay encuestas para mostrar/i)).toBeInTheDocument();
    });
  });
});
