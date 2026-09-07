import { createBrowserRouter } from 'react-router-dom';

import landingLoginRoutes from '../views/landing-login-Santiago/landing-login.routes';
import miPerfilRoutes from '../views/mi-perfil-Santiago/mi-perfil.routes';
import usuariosRoutes from '../views/usuarios/usuarios.routes';
import sedesRoutes from '../views/sedes/sedes.routes';
import eventosRoutes from '../views/eventos/eventos.routes';
import icaRoutes from '../views/ica/ica.routes';
import speRoutes from '../views/spe/spe.routes';

// Esto es lo único "compartido" que se toca, y solo una vez por módulo
// nuevo, no por cada pantalla nueva dentro de un módulo que ya existe.
const router = createBrowserRouter([
  ...landingLoginRoutes,
  ...miPerfilRoutes,
  ...usuariosRoutes,
  ...sedesRoutes,
  ...eventosRoutes,
  ...icaRoutes,
  ...speRoutes,
]);

export default router;
