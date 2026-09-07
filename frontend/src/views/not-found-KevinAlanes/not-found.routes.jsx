import NotFoundPage from './pages/NotFoundPage';

// Ruta comodín — SIEMPRE tiene que quedar como la ÚLTIMA entrada del
// router (ver app/router.jsx: este spread va al final del array), así
// react-router solo la usa cuando ninguna otra ruta hizo match.
const notFoundRoutes = [{ path: '*', element: <NotFoundPage /> }];

export default notFoundRoutes;
