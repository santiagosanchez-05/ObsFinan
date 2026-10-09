import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import ICAPage from './ICAPage';

const DASHBOARD_MOCK = {
  periodo: { year: 2026, quarter: 2 },
  comunas: [
    { id: 1, communityId: 1, nombre: 'Tunari', conocimiento: 70, uso: 60, educacion: 50, prevision: 65, hombres: 62, mujeres: 58, valor: 61.3 },
    { id: 2, communityId: 2, nombre: 'Itocta', conocimiento: 40, uso: 35, educacion: 30, prevision: 45, hombres: 42, mujeres: 34, valor: 37.5 },
  ],
  dimensiones: [
    { dimension: 'Conocimiento', valor: 55 },
    { dimension: 'Uso', valor: 47.5 },
    { dimension: 'Educación', valor: 40 },
    { dimension: 'Previsión', valor: 55 },
  ],
  brechas: [
    { nombre: 'Tunari', hombres: 62, mujeres: 58 },
    { nombre: 'Itocta', hombres: 42, mujeres: 34 },
  ],
  metricas: {
    general: 49.4,
    mejorComuna: { nombre: 'Tunari', valor: 61.3 },
    dimensionCritica: { dimension: 'Educación', valor: 40 },
    brechaGenero: { nombre: 'Itocta', valor: 8 },
  },
  opcionesFiltros: {
    periodos: [{ year: 2026, quarter: 2 }],
    comunidades: [{ id: 1, nombre: 'Tunari' }, { id: 2, nombre: 'Itocta' }],
    dimensiones: ['Conocimiento', 'Uso', 'Educación', 'Previsión'],
    generos: ['hombres', 'mujeres'],
    sedes: [{ campusId: 1, nombre: 'Cochabamba' }, { campusId: 2, nombre: 'La Paz' }],
  },
};

const EXPLORADOR_MOCK = {
  periodo: { year: 2026, quarter: 2 },
  total: 10,
  preguntas: [
    {
      id: 'q05InsurancePurpose',
      numero: 5,
      dimension: 'Conocimiento',
      pregunta: '¿Para qué sirve un seguro?',
      total: 10,
      respuestas: [
        { respuesta: 'Para proteger sus bienes y/o su familia ante sucesos inciertos', cantidad: 7, porcentaje: 70 },
        { respuesta: 'Para evitar posibles situaciones de riesgo', cantidad: 3, porcentaje: 30 },
      ],
    },
  ],
};

function mockFetch() {
  global.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.startsWith('/api/ica/questions')) return Promise.resolve({ ok: true, json: async () => EXPLORADOR_MOCK });
    if (u.startsWith('/api/ica/comunidades')) return Promise.resolve({ ok: true, json: async () => ({ comunidades: [] }) });
    return Promise.resolve({ ok: true, json: async () => DASHBOARD_MOCK });
  });
}

function sesion(role) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Test', role, campusId: 1 } }));
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ICAPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ICAPage — visitante sin cuenta (dashboard público)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockFetch();
  });

  it('muestra el dashboard con el nombre correcto del índice', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Índice de Calidad Aseguradora' })).toBeInTheDocument();
    expect((await screen.findAllByText('Tunari')).length).toBeGreaterThan(0);
  });

  it('pide el dashboard SIN header de autorización (no manda "Bearer null")', async () => {
    renderPage();
    await screen.findAllByText('Tunari');

    const llamadaDashboard = global.fetch.mock.calls.find(([url]) => String(url).startsWith('/api/ica') && !String(url).includes('/questions'));
    expect(llamadaDashboard[1].headers).toEqual({});
  });

  it('no muestra los botones de gestión (historial, subir dataset, registrar)', async () => {
    renderPage();
    await screen.findAllByText('Tunari');

    expect(screen.queryByText('Historial de registros')).not.toBeInTheDocument();
    expect(screen.queryByText('Subir dataset')).not.toBeInTheDocument();
    expect(screen.queryByText('Registrar registro')).not.toBeInTheDocument();
  });

  it('puede filtrar por sede (US29), igual que un Superadmin', async () => {
    renderPage();
    await screen.findAllByText('Tunari');

    expect(screen.getByRole('option', { name: 'La Paz' })).toBeInTheDocument();
  });

  it('muestra los insights del período (US17)', async () => {
    renderPage();

    expect(await screen.findByText(/Tunari lidera el índice general/)).toBeInTheDocument();
    expect(screen.getByText(/Educación es la dimensión más débil/)).toBeInTheDocument();
    expect(screen.getByText(/Itocta presenta la mayor brecha/)).toBeInTheDocument();
  });

  it('en el explorador de preguntas ve la distribución pero NO los botones de exportar respuestas', async () => {
    renderPage();
    await screen.findAllByText('Tunari');

    fireEvent.click(screen.getByRole('button', { name: 'Explorador de preguntas' }));

    expect((await screen.findAllByText('¿Para qué sirve un seguro?')).length).toBeGreaterThan(0);
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'JSON' })).not.toBeInTheDocument();
  });
});

describe('ICAPage — Admin/Superadmin logueado', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockFetch();
  });

  it('un Admin ve los botones de gestión y manda su token', async () => {
    sesion('admin');
    renderPage();
    await screen.findAllByText('Tunari');

    expect(screen.getByText('Historial de registros')).toBeInTheDocument();
    expect(screen.getByText('Registrar registro')).toBeInTheDocument();
    // La carga por dataset se quitó: todos los registros son individuales.
    expect(screen.queryByText('Subir dataset')).not.toBeInTheDocument();
    const llamadaDashboard = global.fetch.mock.calls.find(([url]) => String(url).startsWith('/api/ica'));
    expect(llamadaDashboard[1].headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('un Admin NO ve el filtro de sede (queda fijo en la suya)', async () => {
    sesion('admin');
    renderPage();
    await screen.findAllByText('Tunari');

    expect(screen.queryByRole('option', { name: 'La Paz' })).not.toBeInTheDocument();
  });

  it('un Superadmin ve los botones de exportar respuestas en el explorador', async () => {
    sesion('superadmin');
    renderPage();
    await screen.findAllByText('Tunari');

    fireEvent.click(screen.getByRole('button', { name: 'Explorador de preguntas' }));

    expect(await screen.findByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument();
  });

  it('aplicar un filtro vuelve a pedir el dashboard con ese query param (US28/US30)', async () => {
    sesion('admin');
    renderPage();
    await screen.findAllByText('Tunari');

    fireEvent.change(screen.getByLabelText('Género'), { target: { value: 'mujeres' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ica?gender=mujeres', expect.any(Object));
    });
  });
});
