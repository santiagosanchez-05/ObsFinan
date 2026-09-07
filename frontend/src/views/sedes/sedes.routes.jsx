import SedesPage from './pages/SedesPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

const sedesRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute allow={[ROLES.SUPERADMIN]} />,
        children: [{ path: '/superadmin/sedes', element: <SedesPage /> }],
      },
    ],
  },
];

export default sedesRoutes;
