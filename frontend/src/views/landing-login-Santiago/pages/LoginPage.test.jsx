import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import LoginPage from './LoginPage';

function renderLoginPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('muestra el título "Iniciar sesión"', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('tiene los campos de correo y contraseña', () => {
    renderLoginPage();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });
});
