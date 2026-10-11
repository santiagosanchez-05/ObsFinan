import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import RegistrarEncuestadorPage from './RegistrarEncuestadorPage';

function renderPage(role) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Ana', role, campusId: 2, sede: 'Cochabamba' } }));
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegistrarEncuestadorPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function llenar() {
  fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Luis' } });
  fireEvent.change(screen.getByLabelText('Apellido paterno'), { target: { value: 'Rojas' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'luis@correo.com' } });
}

describe('RegistrarEncuestadorPage (US54)', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ userId: 5, correoEnviado: true }) });
  });

  it('el Admin registra en su sede: no manda campusId', async () => {
    renderPage('admin');
    llenar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar encuestador' }));
    await waitFor(() => expect(screen.getByText('Encuestador registrado')).toBeInTheDocument());
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/users/encuestadores');
    expect(opciones.body.get('correo')).toBe('luis@correo.com');
    expect(opciones.body.has('campusId')).toBe(false);
  });

  it('muestra el error del servidor (correo repetido)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Ya existe un usuario con ese correo' }) });
    renderPage('admin');
    llenar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar encuestador' }));
    expect(await screen.findByText('Ya existe un usuario con ese correo')).toBeInTheDocument();
  });

  it('"Registrar otro" vuelve al formulario vacío', async () => {
    renderPage('admin');
    llenar();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar encuestador' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar otro' }));
    expect(screen.getByLabelText('Nombres')).toHaveValue('');
  });
});
