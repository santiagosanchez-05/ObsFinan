import { ROLES } from './AuthContext';

// Nav autenticado (después de loguearse), por rol. Sprint 2: ya incluye las
// pantallas nuevas (placeholders hasta que cada encargado las construya).
export const NAV_BY_ROLE = {
  [ROLES.SUPERADMIN]: [
    { to: '/superadmin/usuarios', label: 'Usuarios' },
    { to: '/superadmin/sedes', label: 'Sedes' },
    { to: '/eventos', label: 'Eventos' },
    { to: '/convocatorias', label: 'Convocatorias' },
    { to: '/aprobaciones', label: 'Aprobaciones' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'SPE' },
  ],
  [ROLES.ADMIN]: [
    { to: '/eventos', label: 'Eventos' },
    { to: '/convocatorias', label: 'Convocatorias' },
    { to: '/aprobaciones', label: 'Aprobaciones' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'SPE' },
  ],
  [ROLES.ENCUESTADOR]: [
    { to: '/encuestador/eventos', label: 'Mis eventos' },
    { to: '/encuestador/encuestas', label: 'Mis encuestas' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'SPE' },
  ],
};

// A dónde entra cada rol apenas inicia sesión.
export const DEFAULT_ROUTE_BY_ROLE = {
  [ROLES.SUPERADMIN]: '/superadmin/usuarios',
  [ROLES.ADMIN]: '/eventos',
  [ROLES.ENCUESTADOR]: '/encuestador/eventos',
};

// Nav público (sin usuario logueado). Dashboards, agenda y postulación son de acceso libre.
export const PUBLIC_NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/ica', label: 'ICA' },
  { to: '/spe', label: 'Sector Privado Exportador' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/postular', label: 'Convocatorias' },
  { to: '/sobre-nosotros', label: 'Sobre nosotros' },
  { to: '/contacto', label: 'Contacto' },
];
