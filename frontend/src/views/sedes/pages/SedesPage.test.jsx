import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import SedesPage from './SedesPage';

const STATS_MOCK = {
  sedes: [
    { id: 1, label: 'Cochabamba' },
    { id: 2, label: 'La Paz' },
  ],
  global: {
    usuarios: { value: 7 },
    encuestadores: { value: 3 },
    admins: { value: 2 },
    registros: { value: 1500 },
    datasets: { value: 4 },
  },
  resumen: [
    { id: 1, sede: 'Cochabamba', usuarios: 5, registros: 1200 },
    { id: 2, sede: 'La Paz', usuarios: 2, registros: 300 },
  ],
  detalle: {
    1: {
      kpis: { usuarios: { value: 5 }, encuestadores: { value: 2 }, admins: { value: 1 }, registros: { value: 1200 } },
      registrosPorMes: [{ mes: 'Sep', registros: 1200 }],
      admins: [{ id: 5, nombre: 'Ana Admin', correo: 'ana@test.com', datasets: 3, registros: 1200, ultimaActividad: '01/09/2026' }],
    },
  },
};

function sesion() {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Santi', role: 'superadmin', campusId: 1 } }));
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <SedesPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('SedesPage (US15)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    sesion();
  });

  it('pide las estadísticas con ruta relativa (no localhost fijo) y con el token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => STATS_MOCK });

    renderPage();
    await screen.findByText('Usuarios en esta sede');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/sedes/stats',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('arranca en Cochabamba y muestra sus KPIs y administradores', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => STATS_MOCK });

    renderPage();

    expect(await screen.findByText('Usuarios en esta sede')).toBeInTheDocument();
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
  });

  it('al elegir "Todas" muestra el resumen global', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => STATS_MOCK });

    renderPage();
    await screen.findByText('Usuarios en esta sede');
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));

    expect(await screen.findByText('Total de usuarios')).toBeInTheDocument();
    expect(screen.getByText('Actividad y desempeño global')).toBeInTheDocument();
  });

  it('en celular las tarjetas bajan de línea en vez de aplastarse (flex-wrap)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => STATS_MOCK });

    renderPage();
    const etiqueta = await screen.findByText('Usuarios en esta sede');

    const tarjeta = etiqueta.parentElement;
    const fila = tarjeta.parentElement;
    expect(fila.style.flexWrap).toBe('wrap');
    expect(tarjeta.style.flex).toBe('1 1 220px');
  });

  it('las tablas quedan dentro de un contenedor con scroll horizontal', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => STATS_MOCK });

    renderPage();
    await screen.findByText('Ana Admin');

    const tabla = screen.getByRole('table');
    expect(tabla.parentElement.style.overflowX).toBe('auto');
    expect(tabla.style.minWidth).toBe('560px');
  });

  it('si el backend falla, muestra el error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Sin permiso' }) });

    renderPage();

    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
  });
});
