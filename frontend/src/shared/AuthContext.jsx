import { createContext, useContext, useEffect, useRef, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'bfu_auth';
const SESSION_EVENT_KEY = 'bfu_session_event';
const ACTIVITY_KEY = 'bfu_last_activity';

const INACTIVITY_LIMIT = 20 * 60 * 1000;
const ACTIVITY_SYNC_INTERVAL = 5000;
const SESSION_CHECK_INTERVAL = 1000;

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CLIENTE: 'cliente',
};

function leerSesionGuardada() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);

    if (!session?.token || !session?.user) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function leerUltimaActividad() {
  const raw = localStorage.getItem(ACTIVITY_KEY);

  if (!raw) {
    return Date.now();
  }

  const timestamp = Number(raw);

  if (!Number.isFinite(timestamp)) {
    return Date.now();
  }

  return timestamp;
}

function guardarEventoSesion(tipo) {
  localStorage.setItem(
    SESSION_EVENT_KEY,
    JSON.stringify({
      type: tipo,
      timestamp: Date.now(),
    }),
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(leerSesionGuardada);
  const [sessionExpired, setSessionExpired] = useState(false);

  const sessionRef = useRef(session);
  const sessionExpiredRef = useRef(false);

  const lastActivityRef = useRef(leerUltimaActividad());
  const lastActivitySyncRef = useRef(0);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const marcarSesionExpirada = () => {
    if (!sessionRef.current) {
      return;
    }

    if (sessionExpiredRef.current) {
      return;
    }

    sessionExpiredRef.current = true;

    guardarEventoSesion('expired');

    localStorage.removeItem(STORAGE_KEY);

    setSessionExpired(true);
  };

  const cerrarSesionPorLogout = () => {
    sessionExpiredRef.current = false;

    guardarEventoSesion('logout');

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_KEY);

    sessionRef.current = null;

    setSession(null);
    setSessionExpired(false);
  };

  const registrarActividad = () => {
    if (!sessionRef.current || sessionExpiredRef.current) {
      return;
    }

    const ahora = Date.now();

    lastActivityRef.current = ahora;

    if (
      ahora - lastActivitySyncRef.current >=
      ACTIVITY_SYNC_INTERVAL
    ) {
      lastActivitySyncRef.current = ahora;

      localStorage.setItem(
        ACTIVITY_KEY,
        String(ahora),
      );
    }
  };

  const login = ({ token, user }) => {
    const data = {
      token,
      user,
    };

    const ahora = Date.now();

    sessionExpiredRef.current = false;

    lastActivityRef.current = ahora;
    lastActivitySyncRef.current = ahora;

    localStorage.setItem(
      ACTIVITY_KEY,
      String(ahora),
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data),
    );

    sessionRef.current = data;

    setSessionExpired(false);
    setSession(data);
  };

  const logout = () => {
    cerrarSesionPorLogout();
  };

  useEffect(() => {
    const manejarEventoStorage = (event) => {
      if (
        event.key === SESSION_EVENT_KEY &&
        event.newValue
      ) {
        try {
          const evento = JSON.parse(event.newValue);

          if (evento.type === 'expired') {
            marcarSesionExpirada();
            return;
          }

          if (evento.type === 'logout') {
            sessionExpiredRef.current = false;
            sessionRef.current = null;

            setSession(null);
            setSessionExpired(false);

            return;
          }
        } catch {
          return;
        }
      }

      if (
        event.key === ACTIVITY_KEY &&
        event.newValue
      ) {
        const timestamp = Number(event.newValue);

        if (Number.isFinite(timestamp)) {
          lastActivityRef.current = timestamp;
        }
      }

      if (
        event.key === STORAGE_KEY &&
        event.newValue
      ) {
        try {
          const nuevaSesion = JSON.parse(event.newValue);

          if (
            !nuevaSesion?.token ||
            !nuevaSesion?.user
          ) {
            return;
          }

          sessionExpiredRef.current = false;

          sessionRef.current = nuevaSesion;

          lastActivityRef.current =
            leerUltimaActividad();

          setSessionExpired(false);
          setSession(nuevaSesion);
        } catch {
          sessionRef.current = null;

          setSession(null);
          setSessionExpired(false);
        }
      }

      if (
        event.key === STORAGE_KEY &&
        event.newValue === null
      ) {
        if (sessionRef.current) {
          marcarSesionExpirada();
        }
      }
    };

    window.addEventListener(
      'storage',
      manejarEventoStorage,
    );

    return () => {
      window.removeEventListener(
        'storage',
        manejarEventoStorage,
      );
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const eventosActividad = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'pointerdown',
    ];

    eventosActividad.forEach((evento) => {
      window.addEventListener(
        evento,
        registrarActividad,
        { passive: true },
      );
    });

    const revisarInactividad = () => {
      if (
        !sessionRef.current ||
        sessionExpiredRef.current
      ) {
        return;
      }

      const actividadLocal =
        lastActivityRef.current;

      const actividadGlobal =
        leerUltimaActividad();

      const ultimaActividad = Math.max(
        actividadLocal,
        actividadGlobal,
      );

      lastActivityRef.current =
        ultimaActividad;

      const tiempoInactivo =
        Date.now() - ultimaActividad;

      if (
        tiempoInactivo >= INACTIVITY_LIMIT
      ) {
        marcarSesionExpirada();
      }
    };

    const interval = window.setInterval(
      revisarInactividad,
      SESSION_CHECK_INTERVAL,
    );

    return () => {
      eventosActividad.forEach((evento) => {
        window.removeEventListener(
          evento,
          registrarActividad,
        );
      });

      window.clearInterval(interval);
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const revisarExistenciaSesion = () => {
      const raw =
        localStorage.getItem(STORAGE_KEY);

      if (
        !raw &&
        sessionRef.current &&
        !sessionExpiredRef.current
      ) {
        marcarSesionExpirada();
      }
    };

    const interval = window.setInterval(
      revisarExistenciaSesion,
      500,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        login,
        logout,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth debe usarse dentro de un <AuthProvider>',
    );
  }

  return ctx;
}