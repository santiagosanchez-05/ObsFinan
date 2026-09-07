import { useAuth } from './AuthContext';

/**
 * Envuelve cualquier cosa (un botón, una sección) y solo la muestra si el
 * usuario logueado tiene uno de los roles permitidos.
 *
 * Ejemplo real — Dashboard ICA es UN solo componente para los 3 roles;
 * el botón de registrar solo lo ven Admin y Superadmin:
 *
 *   <RoleGate allow={['admin', 'superadmin']}>
 *     <button>+ Registrar registro</button>
 *   </RoleGate>
 */
export default function RoleGate({ allow, children }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return null;
  return children;
}
