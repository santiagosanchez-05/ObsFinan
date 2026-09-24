import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, ROLES } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

// Precargamos la sesión directo en localStorage ANTES de renderizar — así
// AuthProvider arranca ya logueado desde el primer render, sin depender de
// un useEffect que corra después (ProtectedRoute decide y redirige en ese
// primer render, antes de que cualquier efecto posterior llegue a tiempo).
function loguearComo(role, extra = {}) {
  localStorage.setItem('bfu_auth', JSON.stringify({ token: 'fake', user: { nombre: 'Test', role, ...extra } }));
}

function Rutas({ allow }) {
  return (
    <Routes>
      <Route element={<ProtectedRoute allow={allow} />}>
        <Route path="/superadmin/usuarios" element={<div>Contenido protegido</div>} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/cambiar-contrasena-obligatorio" element={<div>Cambiar contraseña obligatorio</div>} />
      </Route>
      <Route path="/login" element={<div>Pantalla Login</div>} />
      <Route path="/eventos" element={<div>Home de Admin/Encuestador</div>} />
    </Routes>
  );
}

function renderRutas({ allow, entry = '/superadmin/usuarios' }) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Rutas allow={allow} />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear());

  it('sin usuario logueado, redirige a /login', () => {
    renderRutas({ allow: [ROLES.SUPERADMIN] });
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument();
  });

  it('usuario logueado pero con un rol que no está permitido, redirige a SU propio home', () => {
    loguearComo(ROLES.ENCUESTADOR);
    renderRutas({ allow: [ROLES.SUPERADMIN] });
    expect(screen.getByText('Home de Admin/Encuestador')).toBeInTheDocument();
  });

  it('usuario logueado con el rol correcto, muestra el contenido', () => {
    loguearComo(ROLES.SUPERADMIN);
    renderRutas({ allow: [ROLES.SUPERADMIN] });
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('sin `allow` especificado, cualquier rol logueado puede entrar', () => {
    loguearComo(ROLES.ENCUESTADOR);
    renderRutas({});
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('con debeCambiarPassword, redirige a /cambiar-contrasena-obligatorio aunque el rol esté permitido', () => {
    loguearComo(ROLES.SUPERADMIN, { debeCambiarPassword: true });
    renderRutas({ allow: [ROLES.SUPERADMIN] });
    expect(screen.getByText('Cambiar contraseña obligatorio')).toBeInTheDocument();
  });

  it('con debeCambiarPassword, esa misma pantalla NO redirige en bucle', () => {
    loguearComo(ROLES.SUPERADMIN, { debeCambiarPassword: true });
    renderRutas({ allow: [ROLES.SUPERADMIN], entry: '/cambiar-contrasena-obligatorio' });
    expect(screen.getByText('Cambiar contraseña obligatorio')).toBeInTheDocument();
  });
});
