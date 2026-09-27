import DiccionarioPage from './pages/DiccionarioPage';
import Layout from '../../shared/Layout';

// Kevin Alanes — US48. Página pública.
const diccionarioRoutes = [
  {
    element: <Layout />,
    children: [{ path: '/diccionario', element: <DiccionarioPage /> }],
  },
];

export default diccionarioRoutes;
