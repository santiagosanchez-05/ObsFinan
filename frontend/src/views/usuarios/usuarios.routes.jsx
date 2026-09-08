import UsuariosPage from './pages/UsuariosPage';
import RegistrarUsuarioPage from './pages/RegistrarUsuarioPage';
import UsuarioDetallePage from './pages/UsuarioDetallePage';
import EditarUsuarioPage from './pages/EditarUsuarioPage';
import Layout from '../../shared/Layout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { ROLES } from '../../shared/AuthContext';

// Cada pantalla nueva de este módulo (Registro, Listado, Detalle, Editar,
// Resetear contraseña) se agrega ACÁ, en este array — nunca en app/router.jsx.
const usuariosRoutes = [
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute allow={[ROLES.SUPERADMIN]} />,
        children: [
          { path: '/superadmin/usuarios', element: <UsuariosPage /> },
          { path: '/superadmin/usuarios/nuevo', element: <RegistrarUsuarioPage /> },
          { path: '/superadmin/usuarios/:id', element: <UsuarioDetallePage /> },
          { path: '/superadmin/usuarios/:id/editar', element: <EditarUsuarioPage /> },
        ],
      },
    ],
  },
];

export default usuariosRoutes;
