import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import NuevoEventoPage from '../pages/NuevoEventoPage';
import EditarEventoPage from '../pages/EditarEventoPage';

const EVENTO = {
  id: 5,
  titulo: 'Feria financiera',
  fecha: '2000-01-01', // ya pasó: al editar se puede dejar igual
  hora: '10:00',
  modalidad: 1,
  lugar: 'Campus Tiquipaya',
  descripcion: '',
  cupos: null,
  enlaceExterno: null,
  sede: 'Cochabamba',
  campusId: 1,
  hasIca: true,
  hasSpe: true,
  imagenUrl: '/api/events/5/image?v=9',
};

function sesion(role, campusId = 1) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Test', role, campusId } }));
}

function renderEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route path="/eventos/nuevo" element={<NuevoEventoPage />} />
          <Route path="/eventos/:id/editar" element={<EditarEventoPage />} />
          <Route path="/eventos/:id" element={<p>Detalle del evento</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const llenar = (etiqueta, valor) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

function llenarObligatorios() {
  llenar('Título', 'Feria financiera');
  llenar('Fecha', '2099-10-15');
  llenar('Hora', '10:00');
  llenar('Modalidad', '1');
  llenar('Lugar o plataforma', 'Campus Tiquipaya');
}

describe('EventoForm — registro', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra los errores de los campos obligatorios sin llamar al backend', async () => {
    sesion('admin');
    global.fetch = vi.fn();
    renderEn('/eventos/nuevo');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));

    expect(await screen.findByText('El título es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La fecha es obligatoria')).toBeInTheDocument();
    expect(screen.getByText('Selecciona la modalidad')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('no deja registrar con fecha pasada ni con un enlace inválido', async () => {
    sesion('admin');
    global.fetch = vi.fn();
    renderEn('/eventos/nuevo');

    llenarObligatorios();
    llenar('Fecha', '2000-01-01');
    llenar('Enlace de inscripción (opcional)', 'facebook.com');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));

    expect(await screen.findByText('La fecha no puede ser anterior a hoy')).toBeInTheDocument();
    expect(screen.getByText('El enlace debe empezar con http:// o https://')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('el Admin registra sin elegir sede, con SPE deshabilitado, y va al detalle', async () => {
    sesion('admin');
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 201, json: async () => ({ eventId: 50 }) }));
    renderEn('/eventos/nuevo');

    expect(screen.queryByLabelText('Sede')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Encuesta SPE/)).toBeDisabled();

    llenarObligatorios();
    fireEvent.click(screen.getByLabelText('Encuesta ICA'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));

    expect(await screen.findByText('Detalle del evento')).toBeInTheDocument();
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/events');
    expect(opciones.method).toBe('POST');
    expect(opciones.body.get('titulo')).toBe('Feria financiera');
    expect(opciones.body.get('hasIca')).toBe('true');
    expect(opciones.body.get('hasSpe')).toBe('false');
    expect(opciones.body.has('campusId')).toBe(false);
  });

  it('el Superadmin tiene que elegir la sede y puede habilitar SPE', async () => {
    sesion('superadmin');
    global.fetch = vi.fn((url) => {
      if (url === '/api/users/campuses') {
        return Promise.resolve({ ok: true, json: async () => [{ id: 3, nombre: 'La Paz' }] });
      }
      return Promise.resolve({ ok: true, status: 201, json: async () => ({ eventId: 51 }) });
    });
    renderEn('/eventos/nuevo');
    await screen.findByRole('option', { name: 'La Paz' });

    llenarObligatorios();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));
    expect(await screen.findByText('Selecciona la sede')).toBeInTheDocument();

    llenar('Sede', '3');
    fireEvent.click(screen.getByLabelText('Encuesta SPE'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));

    await screen.findByText('Detalle del evento');
    const body = global.fetch.mock.calls.at(-1)[1].body;
    expect(body.get('campusId')).toBe('3');
    expect(body.get('hasSpe')).toBe('true');
  });

  it('muestra el error que devuelve el backend', async () => {
    sesion('admin');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 403, json: async () => ({ error: 'Solo puedes registrar eventos de tu sede' }) }),
    );
    renderEn('/eventos/nuevo');
    llenarObligatorios();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo puedes registrar eventos de tu sede');
  });

  it('rechaza imágenes que no son JPG ni PNG', async () => {
    sesion('admin');
    global.fetch = vi.fn();
    renderEn('/eventos/nuevo');
    const archivo = new File(['x'], 'evento.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByTestId('input-imagen'), { target: { files: [archivo] } });
    expect(await screen.findByText('La imagen debe ser JPG o PNG')).toBeInTheDocument();
  });
});

describe('EventoForm — edición', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('carga los datos, permite dejar la fecha pasada, conserva SPE del Admin y quita la imagen', async () => {
    sesion('admin');
    global.fetch = vi.fn((url, opciones = {}) => {
      if (opciones.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ message: 'ok' }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => EVENTO });
    });
    renderEn('/eventos/5/editar');

    expect(await screen.findByDisplayValue('Feria financiera')).toBeInTheDocument();
    expect(screen.getByAltText('Vista previa de la imagen del evento')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Quitar imagen'));
    llenar('Título', 'Feria financiera 2');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Detalle del evento')).toBeInTheDocument();
    const [url, opciones] = global.fetch.mock.calls.at(-1);
    expect(url).toBe('/api/events/5');
    expect(opciones.body.get('titulo')).toBe('Feria financiera 2');
    expect(opciones.body.get('fecha')).toBe('2000-01-01');
    expect(opciones.body.get('hasSpe')).toBe('true');
    expect(opciones.body.get('quitarImagen')).toBe('true');
  });

  it('el Admin de otra sede no puede editar', async () => {
    sesion('admin', 2);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => EVENTO }));
    renderEn('/eventos/5/editar');
    expect(await screen.findByText('Solo puedes editar eventos de tu sede.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument());
  });
});
