import { createBrowserRouter } from 'react-router-dom';

import landingLoginRoutes from '../views/landing-login-Santiago/landing-login.routes';
import miPerfilRoutes from '../views/mi-perfil-Santiago/mi-perfil.routes';
import institucionalRoutes from '../views/institucional-KevinPrieto/institucional.routes';
import usuariosRoutes from '../views/usuarios/usuarios.routes';
import sedesRoutes from '../views/sedes/sedes.routes';
import eventosRoutes from '../views/eventos/eventos.routes';
import icaRoutes from '../views/ica/ica.routes';
import speRoutes from '../views/spe/spe.routes';
// Sprint 2 — ya conectados: para agregar pantallas dentro de estos módulos
// se edita su *.routes.jsx, no este archivo.
import encuestadorRoutes from '../views/encuestador/encuestador.routes';
import aprobacionesRoutes from '../views/aprobaciones-Monserrat/aprobaciones.routes';
import convocatoriasRoutes from '../views/convocatorias/convocatorias.routes';
import diccionarioRoutes from '../views/diccionario-KevinAlanes/diccionario.routes';
import notFoundRoutes from '../views/not-found-KevinAlanes/not-found.routes';

// Esto es lo único "compartido" que se toca, y solo una vez por módulo
// nuevo, no por cada pantalla nueva dentro de un módulo que ya existe.
//
// notFoundRoutes (la ruta comodín "*") SIEMPRE tiene que quedar último en
// este array — si un módulo nuevo se agrega después, ponelo ANTES de esa
// línea, nunca después.
const router = createBrowserRouter([
  ...landingLoginRoutes,
  ...miPerfilRoutes,
  ...institucionalRoutes,
  ...usuariosRoutes,
  ...sedesRoutes,
  ...eventosRoutes,
  ...icaRoutes,
  ...speRoutes,
  ...encuestadorRoutes,
  ...aprobacionesRoutes,
  ...convocatoriasRoutes,
  ...diccionarioRoutes,
  ...notFoundRoutes,
]);

export default router;
