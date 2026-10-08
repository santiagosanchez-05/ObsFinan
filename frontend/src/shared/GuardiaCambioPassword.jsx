import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RUTA_CAMBIO_OBLIGATORIO = '/cambiar-contrasena-obligatorio';

/**
 * Envuelve TODAS las rutas del sistema (app/router.jsx): si el usuario entró
 * con su contraseña temporal (UVL-XXXXXX), lo manda a cambiarla aunque la
 * pantalla a la que va sea pública (Eventos, ICA, SPE, inicio...). El
 * ProtectedRoute solo cuida las rutas protegidas, por eso hace falta esto.
 * El backend igual bloquea todo lo demás con ese token (requireAuth).
 */
export default function GuardiaCambioPassword() {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.debeCambiarPassword && location.pathname !== RUTA_CAMBIO_OBLIGATORIO) {
    return <Navigate to={RUTA_CAMBIO_OBLIGATORIO} replace />;
  }
  return <Outlet />;
}
