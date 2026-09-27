import EventosPage from './pages/EventosPage';
import EventoDetallePage from './pages/EventoDetallePage';
import NuevoEventoPage from './pages/NuevoEventoPage';
import EditarEventoPage from './pages/EditarEventoPage';
import AsignarEncuestadoresPage from './pages/AsignarEncuestadoresPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Sprint 2 — todas de Santiago (US43–US47, US55). "Mis eventos" del
// encuestador vive en views/encuestador.
const eventosRoutes = [
  {
    element: <Layout />,
    children: [
      // Públicas: la agenda la ve cualquiera, con o sin cuenta.
      { path: '/eventos', element: <EventosPage /> },
      { path: '/eventos/:id', element: <EventoDetallePage /> },
      {
        element: <ProtectedRoute allow={[ROLES.ADMIN, ROLES.SUPERADMIN]} />,
        children: [
          { path: '/eventos/nuevo', element: <NuevoEventoPage /> },
          { path: '/eventos/:id/editar', element: <EditarEventoPage /> },
          { path: '/eventos/:id/encuestadores', element: <AsignarEncuestadoresPage /> },
        ],
      },
    ],
  },
];

export default eventosRoutes;
