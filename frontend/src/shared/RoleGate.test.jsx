import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth, ROLES } from './AuthContext';
import RoleGate from './RoleGate';
import { useEffect } from 'react';

// Simula "estar logueado como X" para el test, sin pasar por el login real.
function LoggedInAs({ role, children }) {
  const { login } = useAuth();
  useEffect(() => login({ token: 'fake-token', user: { nombre: 'Test', role } }), [role]);
  return children;
}

// Un mini "Dashboard ICA" de ejemplo: UN solo componente para los 3 roles,
// donde el botón de registrar se muestra u oculta según el rol logueado —
// exactamente el caso que se quería probar.
function DashboardICAEjemplo() {
  return (
    <div>
      <h1>Dashboard ICA</h1>
      <RoleGate allow={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
        <button>+ Registrar registro</button>
      </RoleGate>
    </div>
  );
}

function renderComoRol(role) {
  render(
    <AuthProvider>
      <LoggedInAs role={role}>
        <DashboardICAEjemplo />
      </LoggedInAs>
    </AuthProvider>,
  );
}

describe('RoleGate — mismo Dashboard ICA, botón condicionado por rol', () => {
  // El login guarda la sesión en localStorage — sin esto, un test contamina al siguiente.
  beforeEach(() => localStorage.clear());

  it('Admin ve el botón de registrar', () => {
    renderComoRol(ROLES.ADMIN);
    expect(screen.getByText('+ Registrar registro')).toBeInTheDocument();
  });

  it('Superadmin ve el botón de registrar', () => {
    renderComoRol(ROLES.SUPERADMIN);
    expect(screen.getByText('+ Registrar registro')).toBeInTheDocument();
  });

  it('Cliente NO ve el botón de registrar', () => {
    renderComoRol(ROLES.CLIENTE);
    expect(screen.queryByText('+ Registrar registro')).not.toBeInTheDocument();
  });
});
