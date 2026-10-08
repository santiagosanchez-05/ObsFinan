import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import EventoDetallePage from './EventoDetallePage';

const EVENTO = {
  id: 5,
  titulo: 'Feria financiera',
  fecha: '2099-10-15',
  hora: '10:00',
  modalidad: 1,
  modalidadNombre: 'Presencial',
  lugar: 'Campus Tiquipaya',
  descripcion: 'Charla y encuestas',
  cupos: 30,
  enlaceExterno: 'https://facebook.com/evento',
  sede: 'Cochabamba',
  campusId: 1,
  hasIca: true,
  hasSpe: false,
  imagenUrl: '/api/events/5/image?v=9',
};

function sesion(role, campusId = 1) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Test', role, campusId } }));
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/eventos/5']}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/:id" element={<EventoDetallePage />} />
          <Route path="/eventos" element={<p>Agenda</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('EventoDetallePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra el detalle público con imagen y enlace externo, sin acciones de gestión', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => EVENTO }));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Feria financiera' })).toBeInTheDocument();
    expect(screen.getByText('30 personas')).toBeInTheDocument();
    expect(screen.getByText('Charla y encuestas')).toBeInTheDocument();
    expect(screen.getByAltText('Imagen del evento Feria financiera')).toHaveAttribute('src', '/api/events/5/image?v=9');
    const enlace = screen.getByRole('link', { name: /Inscribirse/ });
    expect(enlace).toHaveAttribute('href', 'https://facebook.com/evento');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('muestra un aviso si el evento no existe', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'Evento no encontrado' }) }));
    renderPage();
    expect(await screen.findByText('Este evento no existe o fue eliminado')).toBeInTheDocument();
  });

  it('el Admin de otra sede no ve las acciones de gestión', async () => {
    sesion('admin', 2);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => EVENTO }));
    renderPage();
    await screen.findByRole('heading', { name: 'Feria financiera' });
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('el Admin de la sede edita, ve encuestadores y elimina con confirmación', async () => {
    sesion('admin', 1);
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ message: 'Evento eliminado correctamente' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => EVENTO });
    });

    renderPage();
    await screen.findByRole('heading', { name: 'Feria financiera' });

    expect(screen.getByRole('link', { name: /Editar/ })).toHaveAttribute('href', '/eventos/5/editar');
    expect(screen.getByRole('link', { name: /Encuestadores/ })).toHaveAttribute('href', '/eventos/5/encuestadores');
    expect(screen.getByText('ICA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1));

    await waitFor(() => expect(screen.getByText('Agenda')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/events/5', expect.objectContaining({ method: 'DELETE' }));
  });

  it('si falla la eliminación muestra el error y se queda en el detalle', async () => {
    sesion('superadmin');
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'DELETE') {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Error interno del servidor' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => EVENTO });
    });

    renderPage();
    await screen.findByRole('heading', { name: 'Feria financiera' });
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor');
  });

  it('el encuestador de la sede se anota y luego puede dejar de participar', async () => {
    sesion('encuestador', 1);
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ participando: true }) });
      }
      if (opciones.method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ participando: false }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ...EVENTO, participando: false }) });
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quiero participar como encuestador' }));

    expect(await screen.findByText('Estás anotado como encuestador')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/events/5/participacion', expect.objectContaining({ method: 'POST' }));
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dejar de participar' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Dejar de participar' }).at(-1));

    expect(await screen.findByRole('button', { name: 'Quiero participar como encuestador' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/events/5/participacion', expect.objectContaining({ method: 'DELETE' }));
  });

  it('el encuestador no ve la opción en eventos de otra sede o sin encuesta', async () => {
    sesion('encuestador', 2);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ ...EVENTO, participando: false }) }));
    renderPage();
    await screen.findByRole('heading', { name: 'Feria financiera' });
    expect(screen.queryByText('Quiero participar como encuestador')).not.toBeInTheDocument();
  });

  it('en un evento pasado solo informa que participó, sin botones', async () => {
    sesion('encuestador', 1);
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: async () => ({ ...EVENTO, fecha: '2000-01-01', participando: true }) }),
    );
    renderPage();
    expect(await screen.findByText('Participaste como encuestador')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dejar de participar' })).not.toBeInTheDocument();
  });
});

