import { ROLES } from './AuthContext';

// Nav autenticado (después de loguearse), por rol.
export const NAV_BY_ROLE = {
  [ROLES.SUPERADMIN]: [
    { to: '/superadmin/usuarios', label: 'Usuarios' },
    { to: '/superadmin/sedes', label: 'Sedes' },
    { to: '/eventos', label: 'Eventos' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'Sector Privado Exportador' },
  ],
  [ROLES.ADMIN]: [
    { to: '/eventos', label: 'Eventos' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'Sector Privado Exportador' },
  ],
  [ROLES.CLIENTE]: [
    { to: '/eventos', label: 'Eventos' },
    { to: '/ica', label: 'ICA' },
    { to: '/spe', label: 'Sector Privado Exportador' },
  ],
};

// A dónde entra cada rol apenas inicia sesión.
// TODO: confirmar default de Admin/Cliente — por ahora uso el primer link de su nav.
export const DEFAULT_ROUTE_BY_ROLE = {
  [ROLES.SUPERADMIN]: '/superadmin/usuarios',
  [ROLES.ADMIN]: '/eventos',
  [ROLES.CLIENTE]: '/eventos',
};

// Nav público (sin usuario logueado).
export const PUBLIC_NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/sobre-nosotros', label: 'Sobre nosotros' },
  { to: '/contacto', label: 'Contacto' },
];
