import UsuariosPage from './pages/UsuariosPage';
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
        children: [{ path: '/superadmin/usuarios', element: <UsuariosPage /> }],
      },
    ],
  },
];

export default usuariosRoutes;
