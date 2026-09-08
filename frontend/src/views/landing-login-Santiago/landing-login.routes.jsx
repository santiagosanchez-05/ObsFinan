import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OlvideMiContrasenaPage from './pages/OlvideMiContrasenaPage';
import VerificarCodigoPage from './pages/VerificarCodigoPage';
import NuevaContrasenaPage from './pages/NuevaContrasenaPage';
import CambiarContrasenaObligatoriaPage from './pages/CambiarContrasenaObligatoriaPage';
import PublicLayout from '../../shared/PublicLayout';
import ProtectedRoute from '../../shared/ProtectedRoute';

// Cada pantalla nueva de este módulo se agrega ACÁ, en este array — nunca
// en app/router.jsx.
//
// "Sobre nosotros" y "Contacto" NO viven acá — son del módulo
// institucional-KevinPrieto, no de este.
//
// Landing va envuelta en PublicLayout (trae el header con nav + botón de
// login). El resto son pantallas standalone, sin ese header, tal como se
// diseñaron en Figma.
const landingLoginRoutes = [
  {
    element: <PublicLayout />,
    children: [{ path: '/', element: <LandingPage /> }],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/olvide-mi-contrasena', element: <OlvideMiContrasenaPage /> },
  { path: '/verificar-codigo', element: <VerificarCodigoPage /> },
  { path: '/nueva-contrasena', element: <NuevaContrasenaPage /> },
  // Requiere sesión (cualquier rol) pero SIN Layout/nav a propósito — si
  // debeCambiarPassword es true, ProtectedRoute redirige acá desde
  // CUALQUIER ruta protegida, así que no tiene sentido mostrar links de
  // navegación que solo rebotarían de vuelta.
  {
    element: <ProtectedRoute />,
    children: [{ path: '/cambiar-contrasena-obligatorio', element: <CambiarContrasenaObligatoriaPage /> }],
  },
];

export default landingLoginRoutes;
