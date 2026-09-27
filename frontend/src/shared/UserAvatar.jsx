import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from './AuthContext';

/**
 * Foto de perfil del usuario logueado (Navbar, Mi perfil). Si no tiene foto
 * muestra un avatar vacío. Se vuelve a pedir cuando cambia `user.fotoVersion`
 * (Mi perfil lo actualiza después de subir una foto nueva).
 */
export default function UserAvatar({ className = 'h-9 w-9', iconSize = 18 }) {
  const { user, token } = useAuth();
  const [url, setUrl] = useState(null);
  const version = user?.fotoVersion;

  useEffect(() => {
    if (!token) return undefined;
    let cancelado = false;
    let objectUrl = null;

    fetch('/api/users/me/photo', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelado || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [token, version]);

  if (url) {
    return <img src={url} alt="Foto de perfil" className={`${className} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span
      aria-label="Sin foto de perfil"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink/40`}
    >
      <User size={iconSize} />
    </span>
  );
}
