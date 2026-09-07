import SobreNosotrosPage from './pages/SobreNosotrosPage';
import ContactoPage from './pages/ContactoPage';
import PublicLayout from '../../shared/PublicLayout';

// Ambas son públicas (no requieren login), por eso van envueltas en
// PublicLayout igual que Landing — así traen el header con nav + login.
const institucionalRoutes = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/sobre-nosotros', element: <SobreNosotrosPage /> },
      { path: '/contacto', element: <ContactoPage /> },
    ],
  },
];

export default institucionalRoutes;
