import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import AsignarEncuestadoresPage from './AsignarEncuestadoresPage';

const EVENTO = {
  id: 5,
  titulo: 'Feria financiera',
  fecha: '2099-10-15',
  sede: 'Cochabamba',
  campusId: 1,
  hasIca: true,
  hasSpe: false,
};

const DATOS = {
  evento: EVENTO,
  asignados: [
    { id: 11, nombre: 'Ana Pérez', correo: 'ana@test.com', seAnotoSolo: true },
    { id: 12, nombre: 'Luis Rojas', correo: 'luis@test.com', seAnotoSolo: false },
  ],
  disponibles: [
    { id: 13, nombre: 'Carla Vargas', correo: 'carla@test.com' },
    { id: 14, nombre: 'Diego Mamani', correo: 'diego@test.com' },
  ],
};

function sesion() {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 7, nombre: 'Admin', role: 'admin', campusId: 1 } }));
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/eventos/5/encuestadores']}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/:id/encuestadores" element={<AsignarEncuestadoresPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const respuesta = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 400, json: async () => body });

describe('AsignarEncuestadoresPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    sesion();
  });

  it('muestra los asignados (con quién se anotó solo) y los disponibles de la sede', async () => {
    global.fetch = vi.fn(() => respuesta(DATOS));
    renderPage();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Se anotó solo')).toBeInTheDocument();
    expect(screen.getByText('Asignado')).toBeInTheDocument();
    expect(screen.getByText('Carla Vargas')).toBeInTheDocument();
    expect(global.fetch.mock.calls[0][0]).toBe('/api/events/5/encuestadores');
  });

  it('busca entre los disponibles', async () => {
    global.fetch = vi.fn(() => respuesta(DATOS));
    renderPage();
    await screen.findByText('Carla Vargas');

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o correo'), { target: { value: 'diego' } });

    expect(screen.queryByText('Carla Vargas')).not.toBeInTheDocument();
    expect(screen.getByText('Diego Mamani')).toBeInTheDocument();
  });

  it('asigna un encuestador y recarga la lista', async () => {
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'POST') return respuesta({ message: 'ok' });
      return respuesta(DATOS);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Asignar a Carla Vargas' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const [url, opciones] = global.fetch.mock.calls[1];
    expect(url).toBe('/api/events/5/encuestadores');
    expect(JSON.parse(opciones.body)).toEqual({ userId: 13 });
  });

  it('quita un encuestador después de confirmar', async () => {
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'DELETE') return respuesta({ message: 'ok' });
      return respuesta(DATOS);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar a Luis Rojas' }));
    const dialogo = screen.getByText('Quitar encuestador').parentElement;
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Quitar' }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/events/5/encuestadores/12', expect.objectContaining({ method: 'DELETE' })),
    );
  });

  it('muestra el error del servidor al asignar', async () => {
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'POST') return respuesta({ error: 'El usuario no es un encuestador activo de la sede del evento' }, false);
      return respuesta(DATOS);
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Asignar a Carla Vargas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no es un encuestador activo');
  });

  it('en un evento pasado solo muestra la lista, sin acciones', async () => {
    global.fetch = vi.fn(() => respuesta({ ...DATOS, evento: { ...EVENTO, fecha: '2000-01-01' } }));
    renderPage();
    expect(await screen.findByText('El evento ya pasó: solo puedes ver quiénes participaron.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar a/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Carla Vargas')).not.toBeInTheDocument();
  });

  it('avisa si el evento no lleva encuestas', async () => {
    global.fetch = vi.fn(() => respuesta({ ...DATOS, asignados: [], evento: { ...EVENTO, hasIca: false } }));
    renderPage();
    expect(await screen.findByText(/no lleva encuestas/)).toBeInTheDocument();
  });

  it('muestra el error si el evento es de otra sede o no existe', async () => {
    global.fetch = vi.fn(() => respuesta({ error: 'No puedes gestionar recursos de otra sede' }, false));
    renderPage();
    expect(await screen.findByText('No puedes gestionar recursos de otra sede')).toBeInTheDocument();
  });
});
