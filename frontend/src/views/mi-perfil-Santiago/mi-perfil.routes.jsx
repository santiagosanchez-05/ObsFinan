import MiPerfilPage from './pages/MiPerfilPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';

// Sin `allow` = cualquier usuario logueado — los 3 roles tienen su propio
// "Mi perfil", al que se entra desde la foto en el nav.
const miPerfilRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/mi-perfil', element: <MiPerfilPage /> }],
      },
    ],
  },
];

export default miPerfilRoutes;
