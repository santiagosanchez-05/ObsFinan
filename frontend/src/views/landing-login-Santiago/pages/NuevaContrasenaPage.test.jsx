import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import NuevaContrasenaPage from './NuevaContrasenaPage';

function renderConRutas(initialEntry) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/nueva-contrasena" element={<NuevaContrasenaPage />} />
        <Route path="/olvide-mi-contrasena" element={<div>Pantalla Olvidé mi contraseña</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NuevaContrasenaPage', () => {
  it('muestra el título, los dos campos y la lista de requisitos', () => {
    renderConRutas({ pathname: '/nueva-contrasena', state: { resetToken: 'abc' } });
    expect(screen.getByRole('heading', { name: 'Crea tu nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeInTheDocument();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Al menos una mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Al menos un número')).toBeInTheDocument();
  });

  it('si no hay resetToken en el state, redirige a "Olvidé mi contraseña"', () => {
    renderConRutas({ pathname: '/nueva-contrasena' }); // sin state
    expect(screen.getByText('Pantalla Olvidé mi contraseña')).toBeInTheDocument();
  });
});
