import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import EventosPage from './EventosPage';

const EVENTO = {
  id: 5,
  titulo: 'Feria financiera',
  fecha: '2099-10-15',
  hora: '10:00',
  modalidad: 1,
  modalidadNombre: 'Presencial',
  lugar: 'Campus Tiquipaya',
  sede: 'Cochabamba',
  campusId: 1,
  hasIca: true,
  hasSpe: false,
  imagenUrl: null,
};

function respuesta(eventos, paginacion = { pagina: 1, porPagina: 12, total: eventos.length, totalPaginas: 1 }) {
  return {
    ok: true,
    json: async () => ({ eventos, paginacion, opcionesFiltros: { sedes: [{ id: 1, nombre: 'Cochabamba' }, { id: 2, nombre: 'La Paz' }] } }),
  };
}

function sesion(role) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Test', role, campusId: 1 } }));
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <EventosPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('EventosPage (agenda)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sin sesión muestra los próximos eventos, sin token ni botón de registrar ni encuestas', async () => {
    global.fetch = vi.fn(() => Promise.resolve(respuesta([EVENTO])));

    renderPage();

    expect(await screen.findByText('Feria financiera')).toBeInTheDocument();
    expect(screen.getByText(/10:00 · Presencial/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Feria financiera/ })).toHaveAttribute('href', '/eventos/5');
    expect(screen.queryByText('Registrar evento')).not.toBeInTheDocument();
    expect(screen.queryByText('Encuesta ICA')).not.toBeInTheDocument();
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/events?periodo=proximos&page=1');
    expect(opciones.headers).toEqual({});
  });

  it('el Admin ve el botón de registrar y qué encuestas lleva cada evento', async () => {
    sesion('admin');
    global.fetch = vi.fn(() => Promise.resolve(respuesta([EVENTO])));

    renderPage();

    expect(await screen.findByText('Encuesta ICA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registrar evento/ })).toHaveAttribute('href', '/eventos/nuevo');
    expect(global.fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('cambia a pasados y filtra por sede', async () => {
    global.fetch = vi.fn(() => Promise.resolve(respuesta([EVENTO])));
    renderPage();
    await screen.findByText('Feria financiera');

    fireEvent.click(screen.getByRole('tab', { name: 'Pasados' }));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/events?periodo=pasados&page=1', expect.anything()));

    fireEvent.change(screen.getByLabelText('Sede'), { target: { value: '2' } });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith('/api/events?periodo=pasados&page=1&campusId=2', expect.anything()),
    );
  });

  it('muestra un mensaje cuando no hay eventos', async () => {
    global.fetch = vi.fn(() => Promise.resolve(respuesta([])));
    renderPage();
    expect(await screen.findByText('No hay eventos próximos')).toBeInTheDocument();
  });

  it('pagina los resultados', async () => {
    global.fetch = vi.fn(() => Promise.resolve(respuesta([EVENTO], { pagina: 1, porPagina: 12, total: 20, totalPaginas: 2 })));
    renderPage();
    await screen.findByText('Página 1 de 2');

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/events?periodo=proximos&page=2', expect.anything()));
  });

  it('muestra el error del servidor', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({ error: 'Error interno del servidor' }) }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno del servidor');
  });

  it('el encuestador ve por defecto solo los eventos donde puede participar, con su estado', async () => {
    sesion('encuestador');
    global.fetch = vi.fn(() =>
      Promise.resolve(
        respuesta([
          { ...EVENTO, participando: true, puedeParticipar: true },
          { ...EVENTO, id: 6, titulo: 'Taller de seguros', participando: false, puedeParticipar: true },
        ]),
      ),
    );

    renderPage();

    expect(await screen.findByText('Ya estás anotado')).toBeInTheDocument();
    expect(screen.getByText('Puedes participar')).toBeInTheDocument();
    expect(global.fetch.mock.calls[0][0]).toBe('/api/events?periodo=proximos&page=1&disponibles=true');
    expect(screen.queryByRole('tab', { name: 'Pasados' })).not.toBeInTheDocument();
    expect(screen.queryByText('Registrar evento')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Solo eventos donde puedo participar/));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/events?periodo=proximos&page=1', expect.anything()));
    expect(screen.getByRole('tab', { name: 'Pasados' })).toBeInTheDocument();
  });
});

