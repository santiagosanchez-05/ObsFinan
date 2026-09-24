import ICAPage from './pages/ICAPage';
import ICAHistory from './pages/ICAHistory';
import ICARegisterPage from './pages/ICARegisterPage';
import ICAFileDetail from './pages/ICAFileDetail';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// El dashboard ICA es público (visitantes sin cuenta incluidos); los botones
// de carga/historial se ocultan con RoleGate adentro según el rol.
const icaRoutes = [
  {
    element: <Layout />,
    children: [
      { path: '/ica', element: <ICAPage /> },
      {
        // Historial ICA, protegido solo para Admin y SuperAdmin 
        element: <ProtectedRoute allow={[ROLES.ADMIN, ROLES.SUPERADMIN]} />,
        children: [
          { path: '/ica/historial', element: <ICAHistory /> },
          { path: '/ica/registrar', element: <ICARegisterPage /> },
          { path: '/ica/historial/:id', element: <ICAFileDetail /> },
        ],
      },
    ],
  },
];

export default icaRoutes;
