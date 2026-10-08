import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MisEventosPage from './MisEventosPage';
import { AuthProvider } from '../../../shared/AuthContext';

const MIS_EVENTOS_MOCK = [
  {
    id: 1,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Feria Financiera Tiquipaya',
    fecha: '2026-04-10',
    hora: '09:00:00',
    modalidad: 1,
    lugar: 'Campus Univalle',
    description: 'Relevamiento feria',
    has_ica: 1,
    has_spe: 0,
  },
  {
    id: 2,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Ronda de Negocios Exportadores',
    fecha: '2026-04-15',
    hora: '14:00:00',
    modalidad: 2,
    lugar: 'Virtual',
    description: 'Relevamiento SPE',
    has_ica: 0,
    has_spe: 1,
  },
  {
    id: 3,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Cumbre Económica Integral',
    fecha: '2026-04-20',
    hora: '10:00:00',
    modalidad: 3,
    lugar: 'Auditorio',
    description: 'Ambas encuestas',
    has_ica: 1,
    has_spe: 1,
  },
  {
    id: 4,
    campusId: 1,
    sede: 'Cochabamba',
    titulo: 'Taller de Capacitación',
    fecha: '2026-04-25',
    hora: '11:00:00',
    modalidad: 1,
    lugar: 'Aula Magna',
    description: 'Sin encuestas',
    has_ica: 0,
    has_spe: 0,
  },
];

describe('MisEventosPage (US56 — Mis eventos del encuestador)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra loader y luego los eventos asignados con sus botones según has_ica y has_spe', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MIS_EVENTOS_MOCK),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MisEventosPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/cargando tus eventos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Feria Financiera Tiquipaya')).toBeInTheDocument();
      expect(screen.getByText('Ronda de Negocios Exportadores')).toBeInTheDocument();
      expect(screen.getByText('Cumbre Económica Integral')).toBeInTheDocument();
      expect(screen.getByText('Taller de Capacitación')).toBeInTheDocument();
    });

    // Evento 1 (has_ica = 1, has_spe = 0): tiene solo botón ICA
    const icaLinks = screen.getAllByRole('link', { name: /registrar encuesta ica/i });
    expect(icaLinks).toHaveLength(2); // eventos 1 y 3
    expect(icaLinks[0]).toHaveAttribute('href', '/encuestador/eventos/1/ica');

    // Evento 2 (has_ica = 0, has_spe = 1): tiene solo botón SPE
    const speLinks = screen.getAllByRole('link', { name: /registrar encuesta spe/i });
    expect(speLinks).toHaveLength(2); // eventos 2 y 3
    expect(speLinks[0]).toHaveAttribute('href', '/encuestador/eventos/2/spe');

    // Evento 3 (has_ica = 1, has_spe = 1): tiene ambos botones
    expect(icaLinks[1]).toHaveAttribute('href', '/encuestador/eventos/3/ica');
    expect(speLinks[1]).toHaveAttribute('href', '/encuestador/eventos/3/spe');
  });

  it('muestra mensaje cuando el encuestador no tiene eventos asignados', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <MisEventosPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tienes eventos asignados/i)).toBeInTheDocument();
    });
  });
});
