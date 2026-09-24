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
    { rol: 'encuestador', total: 1 },
  ],
  usuarios: [
    { id: 1, nombre: 'Ana', apellidos: 'Admin', correo: 'ana@test.com', sede: 'Cochabamba', rol: 'admin', activo: true },
    { id: 2, nombre: 'Carlos', apellidos: 'Cliente', correo: 'carlos@test.com', sede: 'La Paz', rol: 'encuestador', activo: true },
    { id: 3, nombre: 'Lucia', apellidos: 'Rojas', correo: 'lucia@test.com', sede: 'Cochabamba', rol: 'encuestador', activo: false },
  ],
};

const CAMPUSES_MOCK = [
  { id: 1, nombre: 'Cochabamba' },
  { id: 2, nombre: 'La Paz' },
];

// Sirve /api/users/campuses siempre desde CAMPUSES_MOCK y /api/users desde el
// callback que se le pase (para poder responder distinto según los query params).
function mockFetch(usuariosHandler) {
  return vi.fn((url) => {
    if (String(url).startsWith('/api/users/campuses')) {
      return Promise.resolve({ ok: true, json: async () => CAMPUSES_MOCK });
    }
    return usuariosHandler(String(url));
  });
}

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
    global.fetch = mockFetch(() => Promise.resolve({ ok: true, json: async () => DATOS_MOCK }));

    renderPage();

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    const tarjetaTotal = screen.getByText('Total de usuarios').closest('article');
    expect(within(tarjetaTotal).getByText('2')).toBeInTheDocument();
  });

  it('el buscador pide al servidor con el texto ingresado (q) y refresca la tabla', async () => {
    const SOLO_CARLOS = { ...DATOS_MOCK, usuarios: [DATOS_MOCK.usuarios[1]] };
    global.fetch = mockFetch((url) =>
      Promise.resolve({ ok: true, json: async () => (url.includes('q=la+paz') ? SOLO_CARLOS : DATOS_MOCK) }),
    );

    renderPage();
    await screen.findByText('Ana');

    const buscador = screen.getByPlaceholderText('Buscar por nombre, apellido o sede');
    fireEvent.change(buscador, { target: { value: 'la paz' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users?q=la+paz', expect.anything());
    });
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });

  it('el select de rol filtra pidiendo al servidor con el rol elegido', async () => {
    const SOLO_ADMIN = { ...DATOS_MOCK, usuarios: [DATOS_MOCK.usuarios[0]] };
    global.fetch = mockFetch((url) =>
      Promise.resolve({ ok: true, json: async () => (url.includes('rol=admin') ? SOLO_ADMIN : DATOS_MOCK) }),
    );

    renderPage();
    await screen.findByText('Ana');

    fireEvent.change(screen.getByLabelText('Filtrar por rol'), { target: { value: 'admin' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users?rol=admin', expect.anything());
    });
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('el select de sede filtra pidiendo al servidor con el campusId elegido', async () => {
    const SOLO_LAPAZ = { ...DATOS_MOCK, usuarios: [DATOS_MOCK.usuarios[1]] };
    global.fetch = mockFetch((url) =>
      Promise.resolve({ ok: true, json: async () => (url.includes('campusId=2') ? SOLO_LAPAZ : DATOS_MOCK) }),
    );

    renderPage();
    await screen.findByText('Ana');
    // El select de sede se llena de forma asíncrona con /api/users/campuses.
    await screen.findByText('La Paz', { selector: 'option' });

    fireEvent.change(screen.getByLabelText('Filtrar por sede'), { target: { value: '2' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users?campusId=2', expect.anything());
    });
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });

  it('muestra un mensaje de error si la petición falla', async () => {
    global.fetch = mockFetch(() => Promise.resolve({ ok: false, json: async () => ({ error: 'No autorizado' }) }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la información de usuarios.')).toBeInTheDocument();
    });
  });

  it('un usuario dado de baja se muestra como "Bloqueado" con opción de reactivar', async () => {
    global.fetch = mockFetch(() => Promise.resolve({ ok: true, json: async () => DATOS_MOCK }));

    renderPage();
    await screen.findByText('Lucia');

    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
    expect(screen.getByLabelText('Reactivar a Lucia')).toBeInTheDocument();
    expect(screen.getByLabelText('Dar de baja a Ana')).toBeInTheDocument();
  });

  it('dar de baja a un usuario pide confirmación y luego llama al PATCH de estado', async () => {
    global.fetch = mockFetch(() => Promise.resolve({ ok: true, json: async () => DATOS_MOCK }));

    renderPage();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Dar de baja a Ana'));
    expect(await screen.findByText('Dar de baja usuario')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/1/estado',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ activo: false }) }),
      );
    });
  });

  it('cancelar el diálogo de confirmación no llama al PATCH', async () => {
    global.fetch = mockFetch(() => Promise.resolve({ ok: true, json: async () => DATOS_MOCK }));

    renderPage();
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Dar de baja a Ana'));
    await screen.findByText('Dar de baja usuario');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    // La carga inicial pide /api/users y /api/users/campuses; cancelar no agrega más.
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('UsuariosPage — paginación (US8)', () => {
  const PAGINA_1 = {
    ...DATOS_MOCK,
    usuarios: DATOS_MOCK.usuarios.slice(0, 2),
    paginacion: { pagina: 1, porPagina: 2, total: 3, totalPaginas: 2 },
  };
  const PAGINA_2 = {
    ...DATOS_MOCK,
    usuarios: DATOS_MOCK.usuarios.slice(2),
    paginacion: { pagina: 2, porPagina: 2, total: 3, totalPaginas: 2 },
  };

  function paginado(url) {
    return Promise.resolve({ ok: true, json: async () => (url.includes('page=2') ? PAGINA_2 : PAGINA_1) });
  }

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra en qué página está y deshabilita "Anterior" en la primera', async () => {
    global.fetch = mockFetch(paginado);

    renderPage();
    await screen.findByText('Ana');

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();
  });

  it('"Siguiente" pide la página 2 al servidor', async () => {
    global.fetch = mockFetch(paginado);

    renderPage();
    await screen.findByText('Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

    expect(await screen.findByText('Lucia')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/users?page=2', expect.anything());
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('cambiar un filtro vuelve a la página 1', async () => {
    global.fetch = mockFetch(paginado);

    renderPage();
    await screen.findByText('Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await screen.findByText('Lucia');

    fireEvent.change(screen.getByLabelText('Filtrar por rol'), { target: { value: 'admin' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith('/api/users?rol=admin', expect.anything());
    });
  });
});
