import ICAPage from './pages/ICAPage';
import ICAHistory from './pages/ICAHistory';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Sin `allow` = cualquier usuario logueado (los 3 roles ven el mismo
// Dashboard ICA; los botones de carga se ocultan con RoleGate adentro).
const icaRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/ica', element: <ICAPage /> }],
      },
      {
        // Historial ICA, protegido solo para Admin y SuperAdmin 
        element: <ProtectedRoute allow={[ROLES.ADMIN, ROLES.SUPERADMIN]} />,
        children: [{ path: '/ica/historial', element: <ICAHistory /> }],
      },
    ],
  },
];

export default icaRoutes;
