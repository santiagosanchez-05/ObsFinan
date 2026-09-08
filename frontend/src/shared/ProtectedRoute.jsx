import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { DEFAULT_ROUTE_BY_ROLE } from './navConfig';

const RUTA_CAMBIO_OBLIGATORIO = '/cambiar-contrasena-obligatorio';

/**
 * Ruta "guardián": si no hay sesión, manda a /login. Si se logueó con la
 * contraseña temporal (UVL-XXXXXX), lo manda a cambiarla antes de dejarlo
 * ver cualquier otra cosa. Si hay sesión pero el rol no está en `allow`,
 * manda al home de ESE rol (no lo deja ver algo que no le corresponde). Si
 * todo está bien, deja pasar (<Outlet />).
 *
 * Uso en un *.routes.jsx:
 *   { element: <ProtectedRoute allow={[ROLES.SUPERADMIN]} />, children: [...] }
 */
export default function ProtectedRoute({ allow }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  if (user.debeCambiarPassword && location.pathname !== RUTA_CAMBIO_OBLIGATORIO) {
    return <Navigate to={RUTA_CAMBIO_OBLIGATORIO} replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[user.role] ?? '/login'} replace />;
  }

  return <Outlet />;
}
