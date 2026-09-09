import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import SessionExpiredModal from "./SessionExpiredModal";
import { useAuth } from "./AuthContext";

export default function Layout() {
  const { sessionExpired, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Outlet />

      <SessionExpiredModal open={sessionExpired} onFinish={logout} />
    </div>
  );
}
