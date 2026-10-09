import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../../shared/AuthContext';
import RegistrarSpePage from './RegistrarSpePage';

function renderPage() {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'tok', user: { id: 1, nombre: 'Super', role: 'superadmin', campusId: 1 } }));
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegistrarSpePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const irASeccion = (titulo) => fireEvent.click(screen.getByRole('button', { name: new RegExp(titulo) }));

describe('RegistrarSpePage — formulario SOCOMEX–SOCIFIN', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('usa las opciones del instrumento (no las del Excel viejo)', () => {
    renderPage();
    expect(screen.getByRole('option', { name: '26% al 50%' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '25% - 50%' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6 a 10' })).toBeInTheDocument();
  });

  it('"¿Qué otro sector?" solo aparece si elige "Otro"', () => {
    renderPage();
    expect(screen.queryByText('¿Qué otro sector?')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sector exportador'), { target: { value: 'Otro' } });
    expect(screen.getByText('¿Qué otro sector?')).toBeInTheDocument();
  });

  it('en instrumentos permite marcar como máximo 2 y "Ninguno" va solo', () => {
    renderPage();
    irASeccion('Condiciones financieras');
    const acuerdos = screen.getByLabelText('Acuerdos comerciales internacionales');
    const sgp = screen.getByLabelText('Sistema Generalizado de Preferencias (SGP)');
    const reintegro = screen.getByLabelText('Régimen de Reintegro Arancelario');
    fireEvent.click(acuerdos);
    fireEvent.click(sgp);
    expect(reintegro).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Ninguno'));
    expect(screen.getByLabelText('Ninguno')).toBeChecked();
    expect(acuerdos).not.toBeChecked();
  });

  it('no envía el texto de "Otro" si después cambió de opción', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dataLoadId: 1 }) });
    renderPage();
    fireEvent.change(screen.getByLabelText('Sector exportador'), { target: { value: 'Otro' } });
    fireEvent.change(screen.getByPlaceholderText('Especifique el sector'), { target: { value: 'Joyería' } });
    fireEvent.change(screen.getByLabelText('Sector exportador'), { target: { value: 'Textiles' } });

    irASeccion('Inversión y perspectiva futura');
    fireEvent.click(screen.getByRole('button', { name: /Guardar registro/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const enviado = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(enviado.exportSector).toBe('Textiles');
    expect(enviado).not.toHaveProperty('exportSectorOther');
    expect(enviado).not.toHaveProperty('companyName');
  });
});
