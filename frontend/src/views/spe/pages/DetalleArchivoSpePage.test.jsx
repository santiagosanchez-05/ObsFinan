import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DetalleArchivoSpePage from './DetalleArchivoSpePage';
import { AuthProvider } from '../../../shared/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const ARCHIVO_MOCK = {
  archivo: {
    id: 10,
    nombre: 'censo_empresas_2026.xlsx',
    tipoCarga: 2,
    tipoCargaTexto: 'Archivo masivo',
    evento: 'Feria financiera',
    fechaCarga: '2026-03-15T10:00:00.000Z',
    subidoPor: 'Santiago Admin',
    totalRegistros: 2,
    status: 2,
    estado: 'aprobada',
  },
  registros: [
    {
      spe_survey_response_id: 1,
      year: 2026,
      semester: 1,
      s1_department: 'Santa Cruz',
      s1_export_sector: 'Agroindustria',
      s1_company_size: 'Grande',
      s1_main_destination: 'MERCOSUR',
      s2_gdp_expectation: 'Aumentará moderadamente',
      s3_plans_new_markets: 'Sí',
    },
    {
      spe_survey_response_id: 2,
      year: 2026,
      semester: 1,
      s1_department: 'La Paz',
      s1_export_sector: 'Textiles',
      s1_company_size: 'Pequeña',
      s1_main_destination: 'CAN',
      s2_gdp_expectation: 'Estable',
      s3_plans_new_markets: 'No',
    },
  ],
};

describe('DetalleArchivoSpePage (US41 — Detalle de un registro SPE y US42 — Eliminación)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
  });

  it('muestra loader y luego los metadatos y registros del archivo', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ARCHIVO_MOCK),
    });

    render(
      <MemoryRouter initialEntries={['/spe/historial/10']}>
        <AuthProvider>
          <Routes>
            <Route path="/spe/historial/:id" element={<DetalleArchivoSpePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/cargando detalle/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('censo_empresas_2026.xlsx')).toBeInTheDocument();
      expect(screen.getByText('Feria financiera')).toBeInTheDocument();
      expect(screen.getByText('Santiago Admin')).toBeInTheDocument();
      expect(screen.getByText('Agroindustria')).toBeInTheDocument();
      expect(screen.getByText('Textiles')).toBeInTheDocument();
    });
  });

  it('maneja registro no encontrado (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'No encontrado' }),
    });

    render(
      <MemoryRouter initialEntries={['/spe/historial/999']}>
        <AuthProvider>
          <Routes>
            <Route path="/spe/historial/:id" element={<DetalleArchivoSpePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/el registro solicitado no existe o fue eliminado/i)).toBeInTheDocument();
    });
  });

  it('permite abrir el modal y eliminar el registro (US42)', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Archivo eliminado correctamente' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(ARCHIVO_MOCK),
      });
    });

    render(
      <MemoryRouter initialEntries={['/spe/historial/10']}>
        <AuthProvider>
          <Routes>
            <Route path="/spe/historial/:id" element={<DetalleArchivoSpePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('censo_empresas_2026.xlsx')).toBeInTheDocument();
    });

    const botonEliminar = screen.getByRole('button', { name: /eliminar registro/i });
    fireEvent.click(botonEliminar);

    expect(screen.getByText('¿Eliminar este registro SPE?')).toBeInTheDocument();

    const botonConfirmar = screen.getByRole('button', { name: /^eliminar$/i });
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/spe/historial');
    });
    const borrado = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'DELETE');
    expect(borrado[0]).toBe('/api/spe/10');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/spe/registros/10');
  });
});
