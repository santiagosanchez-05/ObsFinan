import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportarSpe from './ExportarSpe';
import { AuthProvider } from '../../../shared/AuthContext';

describe('ExportarSpe (US40 — Descarga de datos SPE pública)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renderiza los botones de exportar Excel y JSON', () => {
    render(
      <AuthProvider>
        <ExportarSpe filtros={{ year: 2026, semester: 1 }} />
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar json/i })).toBeInTheDocument();
  });

  it('ejecuta la descarga en formato Excel (XLSX)', async () => {
    const mockBlob = new Blob(['mock-xlsx-binary'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h) => (h === 'Content-Disposition' ? 'attachment; filename="dataset_spe_2026-11-23.xlsx"' : null),
      },
      blob: () => Promise.resolve(mockBlob),
    });

    render(
      <AuthProvider>
        <ExportarSpe filtros={{ year: 2026, semester: 1, department: 'La Paz' }} />
      </AuthProvider>
    );

    const botonExcel = screen.getByRole('button', { name: /exportar excel/i });
    fireEvent.click(botonExcel);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [urlLlamada, opciones] = global.fetch.mock.calls[0];
    expect(urlLlamada).toContain('/api/spe/export?');
    expect(urlLlamada).toContain('formato=xlsx');
    expect(urlLlamada).toContain('year=2026');
    expect(urlLlamada).toContain('semester=1');
    expect(urlLlamada).toContain('department=La+Paz');
    expect(opciones?.headers?.Authorization).toBeUndefined();
  });

  it('ejecuta la descarga en formato JSON', async () => {
    const mockBlob = new Blob([JSON.stringify([{ id: 1 }])], { type: 'application/json' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => null,
      },
      blob: () => Promise.resolve(mockBlob),
    });

    render(
      <AuthProvider>
        <ExportarSpe filtros={{}} />
      </AuthProvider>
    );

    const botonJson = screen.getByRole('button', { name: /exportar json/i });
    fireEvent.click(botonJson);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [urlLlamada] = global.fetch.mock.calls[0];
    expect(urlLlamada).toContain('formato=json');
  });

  it('muestra mensaje de error si la petición falla', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Error del servidor al exportar' }),
    });

    render(
      <AuthProvider>
        <ExportarSpe filtros={{}} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /exportar excel/i }));

    await waitFor(() => {
      expect(screen.getByText('Error del servidor al exportar')).toBeInTheDocument();
    });
  });
});
