import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import Navbar from './Navbar';

function sesion(role = 'admin') {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 4, nombre: 'Ana Admin', role, campusId: 1 } }));
}

function renderNavbar() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:foto-nav');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  it('muestra la foto de perfil del usuario logueado', async () => {
    sesion();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) });

    renderNavbar();

    const fotos = await screen.findAllByAltText('Foto de perfil');
    expect(fotos[0]).toHaveAttribute('src', 'blob:foto-nav');
    expect(global.fetch).toHaveBeenCalledWith('/api/users/me/photo', { headers: { Authorization: 'Bearer tok' } });
  });

  it('si el usuario no tiene foto, muestra un avatar vacío', async () => {
    sesion();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    renderNavbar();

    expect((await screen.findAllByLabelText('Sin foto de perfil')).length).toBeGreaterThan(0);
  });

  it('cerrar sesión pide confirmación y limpia la sesión (US6)', async () => {
    sesion();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    renderNavbar();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[0]);
    expect(await screen.findByText('¿Seguro que querés cerrar tu sesión?')).toBeInTheDocument();

    const botones = screen.getAllByRole('button', { name: 'Cerrar sesión' });
    fireEvent.click(botones[botones.length - 1]); // el del diálogo

    await waitFor(() => expect(localStorage.getItem('bfu_auth')).toBeNull());
  });

  it('sin sesión no renderiza nada', () => {
    global.fetch = vi.fn();
    renderNavbar();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
