import SPEPage from './pages/SPEPage';
import Layout from '../../shared/Layout';

// Dashboard público (visitantes sin cuenta incluidos); cuando existan botones
// de carga, se ocultan con RoleGate adentro según el rol.
const speRoutes = [
  {
    element: <Layout />,
    children: [{ path: '/spe', element: <SPEPage /> }],
  },
];

export default speRoutes;
