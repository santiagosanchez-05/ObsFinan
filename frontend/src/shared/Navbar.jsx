import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { NAV_BY_ROLE } from './navConfig';
import ConfirmDialog from './ConfirmDialog';
import UserAvatar from './UserAvatar';
import univalleLogo from '../assets/univalleLogo.png';

// Nombres legibles por rol, para mostrar debajo del nombre del usuario.
const ROLE_LABEL = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  encuestador: 'Encuestador',
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const { user, logout } = useAuth();

  const confirmarYSalir = () => {
    setConfirmarLogout(false);
    logout();
  };


  if (!user) return null;

  const links = NAV_BY_ROLE[user.role] ?? [];

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img src={univalleLogo} alt="Univalle" className="h-9 w-9" />
          <span className="whitespace-nowrap font-semibold text-maroon">Bienestar Financiero Univalle</span>
        </div>

        <nav className="hidden items-center gap-1 xl:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive ? 'text-maroon' : 'text-ink/60 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[17px] left-2 right-2 h-0.5 bg-maroon" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Nombre + rol + foto + cerrar sesión — solo desde xl (con 7 links no entra antes) */}
        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          <div className="text-right leading-tight">
            <p className="whitespace-nowrap text-sm font-medium text-ink">{user.nombre}</p>
            <p className="text-xs text-ink/50">{ROLE_LABEL[user.role]}</p>
          </div>
          <Link
            to="/mi-perfil"
            aria-label="Mi perfil"
            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-maroon/30"
          >
            <UserAvatar />
          </Link>
          <button
            onClick={() => setConfirmarLogout(true)}
            className="text-xs text-maroon hover:underline"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Botón hamburguesa — por debajo de 1280px */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink xl:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menú desplegable mobile */}
      {open && (
        <nav className="border-t border-black/5 bg-white px-6 py-3 xl:hidden">
          <Link
            to="/mi-perfil"
            onClick={() => setOpen(false)}
            className="mb-3 flex items-center gap-3 border-b border-black/5 pb-3"
          >
            <UserAvatar />
            <div className="leading-tight">
              <p className="text-sm font-medium text-ink">{user.nombre}</p>
              <p className="text-xs text-ink/50">{ROLE_LABEL[user.role]}</p>
            </div>
          </Link>

          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium ${
                    isActive ? 'bg-maroon/10 text-maroon' : 'text-ink/70'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                setConfirmarLogout(true);
              }}
              className="mt-2 rounded-lg px-4 py-2 text-left text-sm font-medium text-maroon"
            >
              Cerrar sesión
            </button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={confirmarLogout}
        titulo="Cerrar sesión"
        mensaje="¿Seguro que querés cerrar tu sesión?"
        textoConfirmar="Cerrar sesión"
        onConfirm={confirmarYSalir}
        onCancel={() => setConfirmarLogout(false)}
      />
    </header>
  );
}
