import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'bfu_auth';

// Roles válidos del sistema — un solo lugar donde están escritos.
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CLIENTE: 'cliente',
};

function leerSesionGuardada() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(leerSesionGuardada);

  // login({ token, user }) — lo llama LoginPage con la respuesta del backend.
  const login = ({ token, user }) => {
    const data = { token, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSession(data);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  // Actualiza campos del usuario en la sesión activa sin volver a loguear —
  // lo usa, por ejemplo, "cambiar contraseña obligatorio" para apagar
  // debeCambiarPassword apenas se confirma el cambio.
  const actualizarUsuario = (cambios) => {
    setSession((actual) => {
      if (!actual) return actual;
      const data = { ...actual, user: { ...actual.user, ...cambios } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, token: session?.token ?? null, login, logout, actualizarUsuario }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook que cualquier componente usa para saber quién está logueado.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  return ctx;
}
