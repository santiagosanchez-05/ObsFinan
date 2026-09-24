import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import MiPerfilPage from './MiPerfilPage';

function sesion() {
  localStorage.setItem(
    'bfu_auth',
    JSON.stringify({
      token: 'tok',
      user: { id: 4, nombre: 'Ana Admin', first_name: 'Ana', paternal_last_name: 'Admin', maternal_last_name: '', role: 'admin', campusId: 1 },
    }),
  );
}

// tieneFoto: si GET /api/users/me/photo devuelve imagen o 404.
function mockFetch({ tieneFoto = false, subidaOk = true } = {}) {
  global.fetch = vi.fn((url, init = {}) => {
    const metodo = init.method ?? 'GET';
    if (url === '/api/users/me/photo' && metodo === 'GET') {
      return Promise.resolve(
        tieneFoto
          ? { ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) }
          : { ok: false, status: 404, json: async () => ({ error: 'No tenés foto de perfil' }) },
      );
    }
    if (url === '/api/users/me/photo' && metodo === 'PUT') {
      return Promise.resolve({
        ok: subidaOk,
        json: async () => (subidaOk ? { message: 'Foto actualizada correctamente' } : { error: 'La foto debe ser JPG o PNG' }),
      });
    }
    if (url === '/api/auth/update-profile') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ user: { first_name: 'Ana María', paternal_last_name: 'Admin', maternal_last_name: 'Lopez' } }),
      });
    }
    return Promise.reject(new Error(`fetch inesperado: ${url}`));
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MiPerfilPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function llamadas(metodo) {
  return global.fetch.mock.calls.filter(([url, init = {}]) => url === '/api/users/me/photo' && (init.method ?? 'GET') === metodo);
}

describe('MiPerfilPage (US13)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:foto-perfil');
    URL.revokeObjectURL = vi.fn();
    sesion();
  });

  afterEach(() => {
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it('sin foto muestra un avatar vacío (no una imagen de stock)', async () => {
    mockFetch({ tieneFoto: false });
    renderPage();

    expect(await screen.findByLabelText('Sin foto de perfil')).toBeInTheDocument();
    expect(screen.queryByAltText('Foto de perfil')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('pngtree');
  });

  it('con foto muestra la foto propia del usuario', async () => {
    mockFetch({ tieneFoto: true });
    renderPage();

    const img = await screen.findByAltText('Foto de perfil');
    expect(img).toHaveAttribute('src', 'blob:foto-perfil');
    expect(global.fetch).toHaveBeenCalledWith('/api/users/me/photo', { headers: { Authorization: 'Bearer tok' } });
  });

  it('"Cambiar foto" sube la imagen y vuelve a pedir la foto para refrescarla', async () => {
    mockFetch({ tieneFoto: true });
    renderPage();
    await screen.findByAltText('Foto de perfil');

    const archivo = new File(['png'], 'yo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('input-foto-perfil'), { target: { files: [archivo] } });

    expect(await screen.findByText('¡Foto actualizada con éxito!')).toBeInTheDocument();
    expect(llamadas('PUT')).toHaveLength(1);
    expect(llamadas('PUT')[0][1].body).toBeInstanceOf(FormData);
    await waitFor(() => expect(llamadas('GET').length).toBeGreaterThanOrEqual(2));
  });

  it('rechaza un formato que no sea JPG/PNG sin llamar al backend', async () => {
    mockFetch();
    renderPage();
    await screen.findByLabelText('Sin foto de perfil');

    const gif = new File(['gif'], 'yo.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByTestId('input-foto-perfil'), { target: { files: [gif] } });

    expect(await screen.findByText('La foto debe ser JPG o PNG')).toBeInTheDocument();
    expect(llamadas('PUT')).toHaveLength(0);
  });

  it('rechaza una foto de más de 5MB', async () => {
    mockFetch();
    renderPage();
    await screen.findByLabelText('Sin foto de perfil');

    const grande = new File(['x'], 'grande.png', { type: 'image/png' });
    Object.defineProperty(grande, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(screen.getByTestId('input-foto-perfil'), { target: { files: [grande] } });

    expect(await screen.findByText('La foto no puede pesar más de 5MB')).toBeInTheDocument();
    expect(llamadas('PUT')).toHaveLength(0);
  });

  it('guarda nombre y apellidos con PUT /api/auth/update-profile', async () => {
    mockFetch();
    renderPage();
    await screen.findByLabelText('Sin foto de perfil');

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByText('¡Perfil actualizado con éxito!')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/update-profile', expect.objectContaining({ method: 'PUT' }));
  });
});
