import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import CambiarContrasenaObligatoriaPage from './CambiarContrasenaObligatoriaPage';

function loguearComo() {
  localStorage.setItem(
    'bfu_auth',
    JSON.stringify({ token: 'fake-token', user: { id: 1, nombre: 'Test', role: 'cliente', debeCambiarPassword: true } }),
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

async function llenar({ actual = 'UVL-a8K2p9', nueva = 'ContrasenaSegura1', confirmar = 'ContrasenaSegura1' }) {
  fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: actual } });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: nueva } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirmar } });
}

describe('CambiarContrasenaObligatoriaPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('envía la contraseña actual y la nueva a /api/auth/change-password', async () => {
    loguearComo();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'ok' }) });

    renderPagina();
    await llenar({});
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ currentPassword: 'UVL-a8K2p9', newPassword: 'ContrasenaSegura1' }),
        }),
      );
    });
  });

  it('rechaza en el cliente una nueva contraseña con formato de temporal', async () => {
    loguearComo();
    global.fetch = vi.fn();

    renderPagina();
    await llenar({ nueva: 'UVL-b9L3q0', confirmar: 'UVL-b9L3q0' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('No puede tener el formato de una contraseña temporal (UVL-XXXXXX)')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor si la contraseña actual está mal', async () => {
    loguearComo();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'La contraseña actual no es correcta' }) });

    renderPagina();
    await llenar({ actual: 'esta-mal' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument();
  });

  it('tiene un botón de Cerrar sesión por si no quiere cambiarla ahora', async () => {
    loguearComo();
    renderPagina();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(localStorage.getItem('bfu_auth')).toBeNull();
  });
});
