import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import SPEPage from './SPEPage';

const SIN_INDICES = { iee: null, ice: null, iie: null, icie: null };

function respuesta(datos) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => datos });
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <SPEPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('SPEPage — sin datos', () => {
  beforeEach(() => localStorage.clear());

  it('sin encuestas aprobadas avisa que no hay datos en vez de mostrar ceros y gráficos vacíos', async () => {
    respuesta({ periodo: null, totalEmpresas: 0, indices: SIN_INDICES, indicesAnterior: SIN_INDICES, secciones: {} });
    renderPage();

    expect(await screen.findByText('No hay datos aprobados para mostrar')).toBeInTheDocument();
    expect(screen.queryByText('Empresas encuestadas')).not.toBeInTheDocument();
    expect(screen.queryByText('0% Sí')).not.toBeInTheDocument();
    expect(screen.queryByText('Propensión a invertir en 12 meses')).not.toBeInTheDocument();
  });

  it('con datos muestra el dashboard', async () => {
    respuesta({
      periodo: { year: 2026, semester: 2 },
      totalEmpresas: 8,
      indices: { iee: 45.09, ice: 46.64, iie: 42.71, icie: 47.26 },
      indicesAnterior: SIN_INDICES,
      secciones: { inversion: { propension: [{ name: 'Sí', value: 75 }, { name: 'No', value: 25 }] } },
    });
    renderPage();

    expect(await screen.findByText('Empresas encuestadas')).toBeInTheDocument();
    expect(screen.getByText('75% Sí')).toBeInTheDocument();
    expect(screen.queryByText('No hay datos aprobados para mostrar')).not.toBeInTheDocument();
  });

  it('un índice sin valor muestra "Sin datos" y no "-pts"', async () => {
    respuesta({
      periodo: { year: 2026, semester: 2 },
      totalEmpresas: 3,
      indices: { iee: 50, ice: null, iie: null, icie: null },
      indicesAnterior: SIN_INDICES,
      secciones: {},
    });
    renderPage();

    await screen.findByText('Empresas encuestadas');
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThanOrEqual(3);
    expect(document.body.textContent).not.toMatch(/-\s*pts/);
  });
});
