import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import GuardiaCambioPassword from './GuardiaCambioPassword';

function sesion(debeCambiarPassword) {
  localStorage.setItem(
    'bfu_auth',
    JSON.stringify({ token: 'tok', user: { id: 20, nombre: 'Ana', role: 'admin', campusId: 1, debeCambiarPassword } }),
  );
}

function renderEn(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <Routes>
          <Route element={<GuardiaCambioPassword />}>
            <Route path="/eventos" element={<p>Agenda pública</p>} />
            <Route path="/cambiar-contrasena-obligatorio" element={<p>Pantalla de cambio</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('GuardiaCambioPassword', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('con contraseña temporal manda a cambiarla aunque la página sea pública', () => {
    sesion(true);
    renderEn('/eventos');
    expect(screen.getByText('Pantalla de cambio')).toBeInTheDocument();
    expect(screen.queryByText('Agenda pública')).not.toBeInTheDocument();
  });

  it('sin la marca deja pasar', () => {
    sesion(false);
    renderEn('/eventos');
    expect(screen.getByText('Agenda pública')).toBeInTheDocument();
  });

  it('a un visitante sin sesión lo deja pasar', () => {
    renderEn('/eventos');
    expect(screen.getByText('Agenda pública')).toBeInTheDocument();
  });
});
