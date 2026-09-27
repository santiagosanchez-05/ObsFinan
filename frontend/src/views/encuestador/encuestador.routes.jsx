import MisEventosPage from './pages/MisEventosPage';
import MisEncuestasPage from './pages/MisEncuestasPage';
import EncuestaIcaPage from './pages/EncuestaIcaPage';
import EncuestaSpePage from './pages/EncuestaSpePage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Sprint 2 — todo lo que usa el Encuestador. Módulo compartido: cada
// pantalla es de una persona distinta (ver el comentario de cada ruta).
const encuestadorRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute allow={[ROLES.ENCUESTADOR]} />,
        children: [
          { path: '/encuestador/eventos', element: <MisEventosPage /> }, // Kevin Prieto — US56
          { path: '/encuestador/encuestas', element: <MisEncuestasPage /> }, // Kevin Prieto — US61
          { path: '/encuestador/eventos/:eventId/ica', element: <EncuestaIcaPage /> }, // Liz — US57
          { path: '/encuestador/eventos/:eventId/spe', element: <EncuestaSpePage /> }, // Kevin Alanes — US66
        ],
      },
    ],
  },
];

export default encuestadorRoutes;
