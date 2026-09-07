import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import OlvideMiContrasenaPage from './OlvideMiContrasenaPage';

function renderPage() {
  render(
    <MemoryRouter>
      <OlvideMiContrasenaPage />
    </MemoryRouter>,
  );
}

describe('OlvideMiContrasenaPage', () => {
  it('muestra el título y el campo de correo, sin campo de contraseña', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
  });

  it('tiene el botón de enviar y el link de volver', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Enviar correo de recuperación/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/login');
  });
});
