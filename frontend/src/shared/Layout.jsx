import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import PublicHeader from "./PublicHeader";
import SessionExpiredModal from "./SessionExpiredModal";
import { useAuth } from "./AuthContext";

// Las rutas protegidas nunca llegan acá sin sesión (ProtectedRoute redirige);
// las públicas que usan este layout (dashboards ICA/SPE) muestran el header
// público al visitante y el Navbar del sistema al usuario logueado.
export default function Layout() {
  const { user, sessionExpired, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      {user ? <Navbar /> : <PublicHeader />}
      <Outlet />

      <SessionExpiredModal open={sessionExpired} onFinish={logout} />
    </div>
  );
}
