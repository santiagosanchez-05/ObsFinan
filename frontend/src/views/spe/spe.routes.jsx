import SPEPage from './pages/SPEPage';
import RegistrarSpePage from './pages/RegistrarSpePage';
import HistorialSpePage from './pages/HistorialSpePage';
import DetalleArchivoSpePage from './pages/DetalleArchivoSpePage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Dashboard público (Liz). La gestión del SPE es solo del Superadmin (es
// nacional, no hay Admin de sede). Las aprobaciones viven en views/aprobaciones-Monserrat.
const speRoutes = [
  {
    element: <Layout />,
    children: [
      { path: '/spe', element: <SPEPage /> },
      {
        element: <ProtectedRoute allow={[ROLES.SUPERADMIN]} />,
        children: [
          { path: '/spe/registrar', element: <RegistrarSpePage /> }, // Liz — US37
          { path: '/spe/historial', element: <HistorialSpePage /> }, // Monserrat — US38, US39
          { path: '/spe/historial/:id', element: <DetalleArchivoSpePage /> }, // Kevin Prieto — US41
        ],
      },
    ],
  },
];

export default speRoutes;
