import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import UsuariosPage from './UsuariosPage';

const DATOS_MOCK = {
  stats: { totalUsuarios: 2, sedesActivas: 1, adminsActivos: 1, cuentasInactivas: 0 },
  porSede: [{ sede: 'Cochabamba', total: 2 }],
  porRol: [
    { rol: 'admin', total: 1 },
    { rol: 'cliente', total: 1 },
  ],
  usuarios: [
    { id: 1, nombre: 'Ana', apellidos: 'Admin', correo: 'ana@test.com', sede: 'Cochabamba', rol: 'admin', activo: true },
    { id: 2, nombre: 'Carlos', apellidos: 'Cliente', correo: 'carlos@test.com', sede: 'La Paz', rol: 'cliente', activo: true },
  ],
};

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <UsuariosPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra las tarjetas de resumen y la tabla con los usuarios reales', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => DATOS_MOCK });

    renderPage();

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    const tarjetaTotal = screen.getByText('Total de usuarios').closest('article');
    expect(within(tarjetaTotal).getByText('2')).toBeInTheDocument();
  });

  it('el buscador filtra por nombre, apellido o sede', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => DATOS_MOCK });

    renderPage();
    await screen.findByText('Ana');

    const buscador = screen.getByPlaceholderText('Buscar por nombre, apellido o sede');
    fireEvent.change(buscador, { target: { value: 'la paz' } });

    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });

  it('muestra un mensaje de error si la petición falla', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No autorizado' }) });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la información de usuarios.')).toBeInTheDocument();
    });
  });
});
