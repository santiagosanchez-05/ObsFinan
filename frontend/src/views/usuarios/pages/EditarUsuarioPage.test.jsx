import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import EditarUsuarioPage from './EditarUsuarioPage';

const USUARIO_MOCK = {
  id: 2,
  nombre: 'Ana',
  apellidoPaterno: 'Admin',
  apellidoMaterno: 'Lopez',
  apellidos: 'Admin Lopez',
  correo: 'ana@test.com',
  sede: 'Cochabamba',
  campusId: 1,
  rol: 'admin',
  activo: true,
  fechaRegistro: '2026-01-15T10:00:00.000Z',
  fechaActualizacion: '2026-02-20T10:00:00.000Z',
  modificadoPor: null,
};

const CAMPUSES_MOCK = [
  { id: 1, nombre: 'Cochabamba' },
  { id: 2, nombre: 'La Paz' },
];

function mockFetchPorUrl(handlers) {
  return vi.fn((url) => {
    for (const [match, respuesta] of handlers) {
      if (typeof match === 'string' ? url === match : match.test(url)) {
        return Promise.resolve(respuesta);
      }
    }
    return Promise.reject(new Error(`URL no mockeada: ${url}`));
  });
}

function renderPagina(id = '2') {
  render(
    <MemoryRouter initialEntries={[`/superadmin/usuarios/${id}/editar`]}>
      <AuthProvider>
        <Routes>
          <Route path="/superadmin/usuarios/:id/editar" element={<EditarUsuarioPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('EditarUsuarioPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('carga el usuario y las sedes, y precompleta el formulario', async () => {
    global.fetch = mockFetchPorUrl([
      ['/api/users/2', { ok: true, json: async () => USUARIO_MOCK }],
      ['/api/users/campuses', { ok: true, json: async () => CAMPUSES_MOCK }],
    ]);

    renderPagina();

    expect(await screen.findByText('Ana Admin Lopez')).toBeInTheDocument();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cochabamba')).toBeInTheDocument();
  });

  it('guarda los cambios y llama al PATCH con rol, sede y estado', async () => {
    global.fetch = mockFetchPorUrl([
      ['/api/users/2', { ok: true, json: async () => USUARIO_MOCK }],
      ['/api/users/campuses', { ok: true, json: async () => CAMPUSES_MOCK }],
    ]);

    renderPagina();
    await screen.findByText('Ana Admin Lopez');

    fireEvent.change(screen.getByDisplayValue('Admin'), { target: { value: 'cliente' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ rol: 'cliente', campusId: 1, activo: false }),
        }),
      );
    });
  });

  it('muestra el error del servidor si falla el guardado (ej. sede ya tiene admin)', async () => {
    global.fetch = vi.fn((url, opts) => {
      if (url === '/api/users/2' && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Esta sede ya tiene un administrador activo' }) });
      }
      if (url === '/api/users/2') return Promise.resolve({ ok: true, json: async () => USUARIO_MOCK });
      if (url === '/api/users/campuses') return Promise.resolve({ ok: true, json: async () => CAMPUSES_MOCK });
      return Promise.reject(new Error(`URL no mockeada: ${url}`));
    });

    renderPagina();
    await screen.findByText('Ana Admin Lopez');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Esta sede ya tiene un administrador activo')).toBeInTheDocument();
  });

  it('resetear contraseña pide confirmación y muestra el mensaje de éxito', async () => {
    global.fetch = mockFetchPorUrl([
      ['/api/users/2', { ok: true, json: async () => USUARIO_MOCK }],
      ['/api/users/campuses', { ok: true, json: async () => CAMPUSES_MOCK }],
      ['/api/users/2/reset-password', { ok: true, json: async () => ({ passwordTemporal: 'UVL-ab12cd', correoEnviado: true }) }],
    ]);

    renderPagina();
    await screen.findByText('Ana Admin Lopez');

    fireEvent.click(screen.getByRole('button', { name: /Resetear contraseña/ }));
    expect(await screen.findByText(/¿Seguro que querés generar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, resetear' }));

    expect(await screen.findByText('Se le envió un correo con la contraseña temporal.')).toBeInTheDocument();
  });

  it('si falla el envío del correo al resetear, muestra la contraseña temporal como respaldo', async () => {
    global.fetch = mockFetchPorUrl([
      ['/api/users/2', { ok: true, json: async () => USUARIO_MOCK }],
      ['/api/users/campuses', { ok: true, json: async () => CAMPUSES_MOCK }],
      ['/api/users/2/reset-password', { ok: true, json: async () => ({ passwordTemporal: 'UVL-xy99zz', correoEnviado: false }) }],
    ]);

    renderPagina();
    await screen.findByText('Ana Admin Lopez');

    fireEvent.click(screen.getByRole('button', { name: /Resetear contraseña/ }));
    await screen.findByText(/¿Seguro que querés generar/);
    fireEvent.click(screen.getByRole('button', { name: 'Sí, resetear' }));

    expect(await screen.findByText('UVL-xy99zz')).toBeInTheDocument();
  });
});
