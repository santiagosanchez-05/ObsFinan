import ICAPage from './pages/ICAPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';

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
    ],
  },
];

export default icaRoutes;
