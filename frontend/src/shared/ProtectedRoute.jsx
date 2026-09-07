import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { DEFAULT_ROUTE_BY_ROLE } from './navConfig';

/**
 * Ruta "guardián": si no hay sesión, manda a /login. Si hay sesión pero el
 * rol no está en `allow`, manda al home de ESE rol (no lo deja ver algo que
 * no le corresponde). Si todo está bien, deja pasar (<Outlet />).
 *
 * Uso en un *.routes.jsx:
 *   { element: <ProtectedRoute allow={[ROLES.SUPERADMIN]} />, children: [...] }
 */
export default function ProtectedRoute({ allow }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={DEFAULT_ROUTE_BY_ROLE[user.role] ?? '/login'} replace />;
  }

  return <Outlet />;
}
