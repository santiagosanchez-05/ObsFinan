import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PUBLIC_NAV } from './navConfig';
import univalleLogo from '../assets/univalleLogo.png';
import BotonTema from './BotonTema';

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-card">
      <div className="flex h-16 items-center justify-between gap-4 px-5 2xl:gap-6 2xl:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <img src={univalleLogo} alt="Univalle" className="h-9 w-9" />
          <span className="whitespace-nowrap font-semibold text-brand">Bienestar Financiero Univalle</span>
        </div>

        <nav className="hidden items-center gap-1 xl:flex">
          {PUBLIC_NAV.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'text-brand' : 'text-ink/60 hover:text-ink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <BotonTema />
          <Link
            to="/login"
            className="hidden whitespace-nowrap rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white hover:bg-maroon-light xl:inline-block"
          >
            Iniciar sesión
          </Link>

          {/* Botón hamburguesa — por debajo de 1280px (con 7 links el nav no entra antes) */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-ink xl:hidden"
            aria-label="Abrir menú"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menú desplegable mobile */}
      {open && (
        <nav className="border-t border-line/70 bg-card px-6 py-3 xl:hidden">
          <div className="flex flex-col gap-1">
            {PUBLIC_NAV.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium ${
                    isActive ? 'bg-maroon/10 text-brand' : 'text-ink/70'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-maroon px-4 py-2 text-center text-sm font-medium text-white"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
