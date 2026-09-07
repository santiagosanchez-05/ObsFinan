import SPEPage from './pages/SPEPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';

// Sin `allow` = cualquier usuario logueado (los 3 roles ven el mismo
// dashboard; los botones de carga se ocultan con RoleGate adentro).
const speRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/spe', element: <SPEPage /> }],
      },
    ],
  },
];

export default speRoutes;
