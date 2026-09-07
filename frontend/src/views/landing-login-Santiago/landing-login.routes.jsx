import LandingPage from './pages/LandingPage';
import SobreNosotrosPage from './pages/SobreNosotrosPage';
import LoginPage from './pages/LoginPage';
import OlvideMiContrasenaPage from './pages/OlvideMiContrasenaPage';
import VerificarCodigoPage from './pages/VerificarCodigoPage';
import NuevaContrasenaPage from './pages/NuevaContrasenaPage';
import PublicLayout from '../../shared/PublicLayout';

// Cada pantalla nueva de este módulo se agrega ACÁ, en este array — nunca
// en app/router.jsx.
//
// Landing y Sobre nosotros van envueltas en PublicLayout (trae el header
// con nav + botón de login). El resto son pantallas standalone, sin ese
// header, tal como se diseñaron en Figma.
const landingLoginRoutes = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/sobre-nosotros', element: <SobreNosotrosPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/olvide-mi-contrasena', element: <OlvideMiContrasenaPage /> },
  { path: '/verificar-codigo', element: <VerificarCodigoPage /> },
  { path: '/nueva-contrasena', element: <NuevaContrasenaPage /> },
];

export default landingLoginRoutes;
