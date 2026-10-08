import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import CambiarContrasenaObligatoriaPage from './CambiarContrasenaObligatoriaPage';

function loguearComo() {
  localStorage.setItem(
    'bfu_auth',
    JSON.stringify({ token: 'token-temporal', user: { id: 1, nombre: 'Test', role: 'encuestador', debeCambiarPassword: true } }),
  );
}

function renderPagina() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <CambiarContrasenaObligatoriaPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function llenar({ nueva = 'ContrasenaSegura1', confirmar = 'ContrasenaSegura1' }) {
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: nueva } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirmar } });
}

describe('CambiarContrasenaObligatoriaPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('no pide la contraseña temporal: acaba de ingresarla', () => {
    loguearComo();
    renderPagina();
    expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();
  });

  it('envía solo la nueva a /api/auth/first-password y guarda el token nuevo', async () => {
    loguearComo();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'ok', token: 'token-limpio' }) });

    renderPagina();
    llenar({});
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/first-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer token-temporal' }),
          body: JSON.stringify({ newPassword: 'ContrasenaSegura1' }),
        }),
      );
    });
    await waitFor(() => {
      const sesion = JSON.parse(localStorage.getItem('bfu_auth'));
      expect(sesion.token).toBe('token-limpio');
      expect(sesion.user.debeCambiarPassword).toBe(false);
    });
  });

  it('rechaza en el cliente una nueva contraseña con formato de temporal', async () => {
    loguearComo();
    global.fetch = vi.fn();

    renderPagina();
    llenar({ nueva: 'UVL-b9L3q0', confirmar: 'UVL-b9L3q0' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('No puede tener el formato de una contraseña temporal (UVL-XXXXXX)')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('avisa si las contraseñas no coinciden', async () => {
    loguearComo();
    global.fetch = vi.fn();

    renderPagina();
    llenar({ confirmar: 'OtraDistinta1' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor', async () => {
    loguearComo();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Datos inválidos' }) });

    renderPagina();
    llenar({});
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument();
  });

  it('tiene un botón de Cerrar sesión por si no quiere cambiarla ahora', async () => {
    loguearComo();
    renderPagina();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(localStorage.getItem('bfu_auth')).toBeNull();
  });
});
