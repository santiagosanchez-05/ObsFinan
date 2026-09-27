import AprobacionesPage from './pages/AprobacionesPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Monserrat — US58, US59 (ICA: Admin de su sede y Superadmin) y US62 (SPE:
// solo Superadmin, ocultar esa pestaña al Admin con RoleGate).
const aprobacionesRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute allow={[ROLES.ADMIN, ROLES.SUPERADMIN]} />,
        children: [{ path: '/aprobaciones', element: <AprobacionesPage /> }],
      },
    ],
  },
];

export default aprobacionesRoutes;
