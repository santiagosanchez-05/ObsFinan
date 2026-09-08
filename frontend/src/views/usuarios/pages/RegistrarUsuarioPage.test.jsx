import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import RegistrarUsuarioPage from './RegistrarUsuarioPage';

const CAMPUSES_MOCK = [
  { id: 1, nombre: 'Cochabamba' },
  { id: 2, nombre: 'La Paz' },
];

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegistrarUsuarioPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function llenarFormulario() {
  fireEvent.change(screen.getByPlaceholderText('Ej. Juan Ignacio'), { target: { value: 'Juan' } });
  fireEvent.change(screen.getByPlaceholderText('Ej. Pérez'), { target: { value: 'Pérez' } });
  fireEvent.change(screen.getByPlaceholderText('usuario@univalle.edu'), { target: { value: 'juan@univalle.edu' } });
  fireEvent.change(screen.getByDisplayValue('Asignar rol').closest('select'), { target: { value: 'admin' } });
  await screen.findByText('Cochabamba');
  fireEvent.change(screen.getByDisplayValue('Selecciona sede').closest('select'), { target: { value: '1' } });
}

describe('RegistrarUsuarioPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('carga las sedes activas apenas monta', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => CAMPUSES_MOCK });

    renderPage();

    expect(await screen.findByText('Cochabamba')).toBeInTheDocument();
    expect(screen.getByText('La Paz')).toBeInTheDocument();
  });

  it('registra al usuario y muestra la pantalla de éxito', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => CAMPUSES_MOCK })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 10, passwordTemporal: 'UVL-ab12cd', correoEnviado: true }),
      });

    renderPage();
    await llenarFormulario();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar usuario' }));

    expect(await screen.findByText('Usuario registrado correctamente')).toBeInTheDocument();
    expect(screen.getByText('Le enviamos un correo con su contraseña temporal.')).toBeInTheDocument();

    // El segundo fetch fue el POST con FormData a /api/users
    const [, segundaLlamada] = global.fetch.mock.calls;
    expect(segundaLlamada[0]).toBe('/api/users');
    expect(segundaLlamada[1].method).toBe('POST');
    expect(segundaLlamada[1].body).toBeInstanceOf(FormData);
  });

  it('si el correo no se pudo enviar, muestra la contraseña temporal como respaldo', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => CAMPUSES_MOCK })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 11, passwordTemporal: 'UVL-xy99zz', correoEnviado: false }),
      });

    renderPage();
    await llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar usuario' }));

    expect(await screen.findByText('UVL-xy99zz')).toBeInTheDocument();
  });

  it('muestra el error del servidor si el correo ya existe', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => CAMPUSES_MOCK })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Ya existe un usuario con ese correo' }) });

    renderPage();
    await llenarFormulario();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar usuario' }));

    await waitFor(() => {
      expect(screen.getByText('Ya existe un usuario con ese correo')).toBeInTheDocument();
    });
  });

  it('no envía el formulario si faltan campos obligatorios', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => CAMPUSES_MOCK });

    renderPage();
    await screen.findByText('Cochabamba');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar usuario' }));

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    // Solo se llamó el fetch de las sedes, nunca el POST.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
