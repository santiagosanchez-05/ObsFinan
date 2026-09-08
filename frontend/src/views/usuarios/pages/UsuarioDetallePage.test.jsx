import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import UsuarioDetallePage from './UsuarioDetallePage';

const USUARIO_MOCK = {
  id: 2,
  nombre: 'Ana',
  apellidoPaterno: 'Admin',
  apellidoMaterno: 'Lopez',
  apellidos: 'Admin Lopez',
  correo: 'ana@test.com',
  sede: 'Cochabamba',
  rol: 'admin',
  activo: true,
  fechaRegistro: '2026-01-15T10:00:00.000Z',
  fechaActualizacion: '2026-02-20T10:00:00.000Z',
};

function renderDetalle(id = '2') {
  render(
    <MemoryRouter initialEntries={[`/superadmin/usuarios/${id}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/superadmin/usuarios/:id" element={<UsuarioDetallePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('UsuarioDetallePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra los datos del usuario', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => USUARIO_MOCK });

    renderDetalle();

    expect(await screen.findByRole('heading', { name: 'Ana Admin Lopez' })).toBeInTheDocument();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.getByText('Cochabamba')).toBeInTheDocument();
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0); // badge + Rol
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0); // badge + Estado
    expect(screen.getByText('Lopez')).toBeInTheDocument(); // apellido materno por separado
  });

  it('llama a /api/users/:id con el id de la URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => USUARIO_MOCK });

    renderDetalle('2');
    await screen.findByRole('heading', { name: 'Ana Admin Lopez' });

    expect(global.fetch).toHaveBeenCalledWith('/api/users/2', expect.any(Object));
  });

  it('muestra un mensaje de error si el usuario no existe', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Usuario no encontrado' }) });

    renderDetalle('999');

    await waitFor(() => {
      expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument();
    });
  });

  it('si el usuario tiene foto, la pide a /api/users/:id/photo y la muestra en vez de las iniciales', async () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    global.fetch = vi.fn((url) => {
      if (url === '/api/users/2/photo') {
        return Promise.resolve({ ok: true, blob: async () => new Blob(['contenido-de-prueba']) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ ...USUARIO_MOCK, tieneFoto: true }) });
    });

    renderDetalle('2');
    await screen.findByRole('heading', { name: 'Ana Admin Lopez' });

    const foto = await screen.findByAltText('Foto de Ana');
    expect(foto).toHaveAttribute('src', 'blob:mock-url');
    expect(global.fetch).toHaveBeenCalledWith('/api/users/2/photo', expect.any(Object));
  });

  it('si el usuario NO tiene foto, muestra las iniciales y no pide la foto', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...USUARIO_MOCK, tieneFoto: false }) });

    renderDetalle('2');
    await screen.findByRole('heading', { name: 'Ana Admin Lopez' });

    expect(screen.queryByAltText('Foto de Ana')).not.toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument(); // iniciales: Ana Admin
    expect(global.fetch).toHaveBeenCalledTimes(1); // solo el detalle, no la foto
  });
});
