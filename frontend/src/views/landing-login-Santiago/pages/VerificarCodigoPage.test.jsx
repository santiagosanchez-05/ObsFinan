import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import VerificarCodigoPage from './VerificarCodigoPage';

function renderConRutas(initialEntry) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/verificar-codigo" element={<VerificarCodigoPage />} />
        <Route path="/olvide-mi-contrasena" element={<div>Pantalla Olvidé mi contraseña</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerificarCodigoPage', () => {
  it('muestra el título y 6 casillas para el código', () => {
    renderConRutas({ pathname: '/verificar-codigo', state: { email: 'test@test.com' } });
    expect(screen.getByRole('heading', { name: /Ingresa tu código de recuperación/i })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('el botón "Verificar código" empieza deshabilitado', () => {
    renderConRutas({ pathname: '/verificar-codigo', state: { email: 'test@test.com' } });
    expect(screen.getByRole('button', { name: /Verificar código/i })).toBeDisabled();
  });

  it('si no hay email en el state, redirige a "Olvidé mi contraseña"', () => {
    renderConRutas({ pathname: '/verificar-codigo' }); // sin state
    expect(screen.getByText('Pantalla Olvidé mi contraseña')).toBeInTheDocument();
  });
});
