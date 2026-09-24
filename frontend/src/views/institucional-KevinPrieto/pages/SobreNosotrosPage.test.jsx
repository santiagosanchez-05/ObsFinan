import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import SobreNosotrosPage from './SobreNosotrosPage';

function renderPage() {
  render(
    <MemoryRouter>
      <SobreNosotrosPage />
    </MemoryRouter>,
  );
}

describe('SobreNosotrosPage (US31)', () => {
  it('muestra las secciones institucionales', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('¿Qué es el Observatorio de Bienestar Financiero?');
    expect(screen.getByRole('heading', { name: '¿Para qué sirve?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Qué analiza?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Metodología' })).toBeInTheDocument();
  });

  it('usa el nombre correcto del ICA', () => {
    renderPage();

    expect(screen.getByText('ICA — Índice de Calidad Aseguradora')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ahorro/i);
  });
});
