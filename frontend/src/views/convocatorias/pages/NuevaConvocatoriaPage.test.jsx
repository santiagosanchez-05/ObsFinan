import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import NuevaConvocatoriaPage from './NuevaConvocatoriaPage';

function renderPage(role) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Ana', role, campusId: 2, sede: 'Cochabamba' } }));
  render(
    <MemoryRouter>
      <AuthProvider>
        <NuevaConvocatoriaPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('NuevaConvocatoriaPage (US50)', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 9 }) });
  });

  it('el Admin crea en su sede sin elegirla', async () => {
    renderPage('admin');
    expect(screen.getByText('Cochabamba')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Encuestadores 2026-II' } });
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear convocatoria' }));

    await waitFor(() => expect(screen.getByText('Convocatoria creada')).toBeInTheDocument());
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/convocatorias');
    expect(JSON.parse(opciones.body)).toEqual(expect.objectContaining({ campus_id: 2, title: 'Encuestadores 2026-II' }));
  });

  it('no deja que el cierre sea antes del inicio', async () => {
    renderPage('admin');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2099-05-10' } });
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2099-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear convocatoria' }));
    expect(await screen.findByText('El cierre no puede ser antes del inicio')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('el Superadmin tiene que elegir la sede', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1, nombre: 'La Paz' }] });
    renderPage('superadmin');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2099-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear convocatoria' }));
    expect(await screen.findByText('Selecciona la sede')).toBeInTheDocument();
  });
});
