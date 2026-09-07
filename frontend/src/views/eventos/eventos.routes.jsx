import EventosPage from './pages/EventosPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';

// Sin `allow` = cualquier usuario logueado puede entrar (Superadmin, Admin
// y Cliente ven la misma pantalla; lo que cambia adentro son los botones,
// con RoleGate — no una pantalla distinta por rol).
const eventosRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ path: '/eventos', element: <EventosPage /> }],
      },
    ],
  },
];

export default eventosRoutes;
