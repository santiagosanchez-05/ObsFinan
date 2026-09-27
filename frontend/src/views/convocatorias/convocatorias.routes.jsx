import ConvocatoriasPage from './pages/ConvocatoriasPage';
import NuevaConvocatoriaPage from './pages/NuevaConvocatoriaPage';
import PostulantesPage from './pages/PostulantesPage';
import RegistrarEncuestadorPage from './pages/RegistrarEncuestadorPage';
import PostularPage from './pages/PostularPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Sprint 2 — Kevin Alanes y Kevin Prieto (ver el comentario de cada ruta).
const convocatoriasRoutes = [
  {
    element: <Layout />,
    children: [
      // Pública: el candidato se postula sin cuenta.
      { path: '/postular', element: <PostularPage /> }, // Kevin Prieto — US52
      {
        element: <ProtectedRoute allow={[ROLES.ADMIN, ROLES.SUPERADMIN]} />,
        children: [
          { path: '/convocatorias', element: <ConvocatoriasPage /> }, // Kevin Prieto — US51
          { path: '/convocatorias/nueva', element: <NuevaConvocatoriaPage /> }, // Kevin Alanes — US50
          { path: '/convocatorias/:id/postulantes', element: <PostulantesPage /> }, // Kevin Alanes — US53
          { path: '/encuestadores/nuevo', element: <RegistrarEncuestadorPage /> }, // Kevin Alanes — US54
        ],
      },
    ],
  },
];

export default convocatoriasRoutes;
