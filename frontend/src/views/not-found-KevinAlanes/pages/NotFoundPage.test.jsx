import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import notFoundRoutes from '../not-found.routes';

function renderEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<p>Inicio</p>} />
        {notFoundRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotFoundPage (US25)', () => {
  it('una URL que no existe muestra la página 404', () => {
    renderEn('/esta-ruta-no-existe');

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });

  it('"Volver al inicio" lleva a la página principal', () => {
    renderEn('/cualquier/cosa');

    fireEvent.click(screen.getByRole('button', { name: /Volver al inicio/ }));

    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });
});
