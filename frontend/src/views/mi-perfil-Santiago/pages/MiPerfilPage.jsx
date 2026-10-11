import React, { useState, useEffect, useRef } from 'react';
import { Camera, Lock, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';
import UserAvatar from '../../../shared/UserAvatar';

// Mismos límites que valida el backend (PUT /api/users/me/photo).
const TIPOS_FOTO = ['image/jpeg', 'image/png'];
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

function obtenerUsuarioInicial(user) {
  try {
    const authRaw = localStorage.getItem('bfu_auth');
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      if (parsed?.user) {
        return parsed.user;
      }
    }
  } catch (e) {
    console.error('Error al leer bfu_auth en MiPerfilPage:', e);
  }
  return user || null;
}

export default function MiPerfilPage() {
  const { user, token, actualizarUsuario } = useAuth();

  const [nombres, setNombres] = useState(() => {
    const u = obtenerUsuarioInicial(user);
    return u?.first_name || u?.nombres || '';
  });
  const [apellidoPaterno, setApellidoPaterno] = useState(() => {
    const u = obtenerUsuarioInicial(user);
    return u?.paternal_last_name || u?.apellidoPaterno || '';
  });
  const [apellidoMaterno, setApellidoMaterno] = useState(() => {
    const u = obtenerUsuarioInicial(user);
    return u?.maternal_last_name || u?.apellidoMaterno || '';
  });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState({ tipo: '', texto: '' });
  const inputFotoRef = useRef(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState({ tipo: '', texto: '' });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  // Sincronización cuando user cambia externamente
  useEffect(() => {
    const u = obtenerUsuarioInicial(user);
    if (u) {
      setNombres(u.first_name || u.nombres || '');
      setApellidoPaterno(u.paternal_last_name || u.apellidoPaterno || '');
      setApellidoMaterno(u.maternal_last_name || u.apellidoMaterno || '');
    }
  }, [user]);


  // 1. Manejo del botón Guardar Cambios con persistencia en MySQL y localStorage (bfu_auth)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMensajePerfil({ tipo: '', texto: '' });

    const trimmedNombres = nombres.trim();
    const trimmedApellidoPaterno = apellidoPaterno.trim();
    const trimmedApellidoMaterno = apellidoMaterno.trim();

    if (!trimmedNombres || !trimmedApellidoPaterno) {
      setMensajePerfil({ tipo: 'error', texto: 'El nombre y apellido paterno son obligatorios' });
      return;
    }

    setGuardandoPerfil(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: trimmedNombres,
          paternal_last_name: trimmedApellidoPaterno,
          maternal_last_name: trimmedApellidoMaterno || null,
          nombres: trimmedNombres,
          apellidoPaterno: trimmedApellidoPaterno,
          apellidoMaterno: trimmedApellidoMaterno || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensajePerfil({ tipo: 'error', texto: data.error || 'Error al actualizar el perfil' });
        return;
      }

      const updatedUser = data.user;

      // Actualizar el estado en AuthContext
      if (actualizarUsuario) {
        actualizarUsuario(updatedUser);
      }

      // Sincronizar explícitamente localStorage ('bfu_auth') manteniendo la estructura { token, user }
      try {
        const rawAuth = localStorage.getItem('bfu_auth');
        const currentAuth = rawAuth ? JSON.parse(rawAuth) : {};
        const newAuth = {
          ...currentAuth,
          token: currentAuth.token || token,
          user: {
            ...(currentAuth.user || {}),
            ...updatedUser,
            first_name: updatedUser.first_name || trimmedNombres,
            paternal_last_name: updatedUser.paternal_last_name || trimmedApellidoPaterno,
            maternal_last_name: updatedUser.maternal_last_name !== undefined ? updatedUser.maternal_last_name : trimmedApellidoMaterno,
            nombres: updatedUser.first_name || trimmedNombres,
            apellidoPaterno: updatedUser.paternal_last_name || trimmedApellidoPaterno,
            apellidoMaterno: updatedUser.maternal_last_name !== undefined ? updatedUser.maternal_last_name : trimmedApellidoMaterno,
            nombre: updatedUser.nombre || `${trimmedNombres} ${trimmedApellidoPaterno}`.trim(),
          },
        };
        localStorage.setItem('bfu_auth', JSON.stringify(newAuth));
      } catch (err) {
        console.error('Error al persistir en localStorage:', err);
      }

      setNombres(updatedUser.first_name || trimmedNombres);
      setApellidoPaterno(updatedUser.paternal_last_name || trimmedApellidoPaterno);
      setApellidoMaterno(updatedUser.maternal_last_name || trimmedApellidoMaterno || '');

      setMensajePerfil({ tipo: 'success', texto: '¡Perfil actualizado con éxito!' });
    } catch (err) {
      console.error('Error en update-profile:', err);
      setMensajePerfil({ tipo: 'error', texto: 'Error de conexión con el servidor. Intentá de nuevo.' });
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // US13 — cambiar la foto propia.
  const handleCambiarFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si falla
    if (!archivo) return;

    setMensajePerfil({ tipo: '', texto: '' });
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setMensajePerfil({ tipo: 'error', texto: 'La foto debe ser JPG o PNG' });
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setMensajePerfil({ tipo: 'error', texto: 'La foto no puede pesar más de 5MB' });
      return;
    }

    const formData = new FormData();
    formData.append('foto', archivo);

    setSubiendoFoto(true);
    try {
      const res = await fetch('/api/users/me/photo', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMensajePerfil({ tipo: 'error', texto: data.error || 'No se pudo actualizar la foto' });
        return;
      }
      // Fuerza a que el Navbar y el avatar de esta pantalla vuelvan a pedir la foto.
      actualizarUsuario?.({ fotoVersion: Date.now() });
      setMensajePerfil({ tipo: 'success', texto: '¡Foto actualizada con éxito!' });
    } catch (err) {
      console.error('Error al subir la foto:', err);
      setMensajePerfil({ tipo: 'error', texto: 'Error de conexión con el servidor. Intentá de nuevo.' });
    } finally {
      setSubiendoFoto(false);
    }
  };

  // 2. Manejo del botón Actualizar Contraseña conectado con /api/auth/change-password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMensajePassword({ tipo: '', texto: '' });

    if (!hasMinLength || !hasUpper || !hasNumber) {
      setMensajePassword({ tipo: 'error', texto: 'La nueva contraseña no cumple con todos los requisitos de seguridad.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMensajePassword({ tipo: 'error', texto: 'Las contraseñas no coinciden' });
      return;
    }

    setGuardandoPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensajePassword({ tipo: 'error', texto: data.error || 'Error al actualizar la contraseña' });
        return;
      }

      setMensajePassword({ tipo: 'success', texto: '¡Contraseña actualizada con éxito!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setMensajePassword({ tipo: 'error', texto: 'Error de conexión con el servidor. Intentá de nuevo.' });
    } finally {
      setGuardandoPassword(false);
    }
  };


  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Mi perfil</h1>
        <p className="text-sm text-muted mt-1">
          Administra tu información personal y tu contraseña
        </p>
      </div>

      {/* TARJETA 1: Información Personal */}
      <div className="rounded-2xl bg-card p-8 shadow-sm border border-line">
        <h2 className="text-lg font-bold text-ink mb-6">Información personal</h2>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {mensajePerfil.texto && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                mensajePerfil.tipo === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
              }`}
            >
              {mensajePerfil.texto}
            </div>
          )}

          {/* Foto de perfil: la real si existe, avatar vacío si no */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar className="h-20 w-20" iconSize={32} />
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={subiendoFoto}
                aria-label="Cambiar foto de perfil"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-white shadow hover:opacity-90 disabled:opacity-60"
              >
                <Camera size={14} />
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={subiendoFoto}
                className="font-bold text-brand hover:underline text-sm disabled:opacity-60"
              >
                {subiendoFoto ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              <p className="text-xs text-muted mt-0.5">JPG o PNG. Máximo 5MB.</p>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleCambiarFoto}
                className="hidden"
                data-testid="input-foto-perfil"
              />
            </div>
          </div>

          {/* Campo: Nombres */}
          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1.5">
              Nombres
            </label>
            <input
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card"
            />
          </div>

          {/* Campos: Apellidos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1.5">
                Apellido paterno
              </label>
              <input
                type="text"
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
                className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-2 mb-1.5">
                Apellido materno
              </label>
              <input
                type="text"
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
                className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card"
              />
            </div>
          </div>

          {/* Información Restringida */}
          <div className="rounded-xl border border-line bg-subtle/70 p-5 space-y-4">
            <div className="flex items-center gap-2 text-muted font-bold text-xs tracking-wider">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-white">
                i
              </span>
              INFORMACIÓN RESTRINGIDA
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <span className="text-muted block mb-0.5">Correo electrónico</span>
                <span className="font-medium text-muted flex items-center gap-1.5">
                  {user?.correo || 'Sin correo'} <Lock size={12} className="text-muted" />
                </span>
              </div>
              <div>
                <span className="text-muted block mb-0.5">Rol</span>
                <span className="font-medium text-muted flex items-center gap-1.5">
                  {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Usuario'} <Lock size={12} className="text-muted" />
                </span>
              </div>
              <div>
                <span className="text-muted block mb-0.5">Sede</span>
                <span className="font-medium text-muted flex items-center gap-1.5">
                  {user?.sede || 'Cochabamba'} <Lock size={12} className="text-muted" />
                </span>
              </div>
              <div>
                <span className="text-muted block mb-0.5">Estado</span>
                <span className="font-medium text-muted flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Activo <Lock size={12} className="text-muted" />
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted pt-1">
              Estos datos solo pueden ser modificados por un administrador del sistema.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={guardandoPerfil}
              className="rounded-xl bg-maroon px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* TARJETA 2: Cambiar Contraseña */}
      <div className="rounded-2xl bg-card p-8 shadow-sm border border-line">
        <h2 className="text-lg font-bold text-ink mb-6">Cambiar contraseña</h2>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {mensajePassword.texto && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                mensajePassword.tipo === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
              }`}
            >
              {mensajePassword.texto}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-2 mb-1.5">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full rounded-xl border border-line bg-subtle/50 px-4 py-2.5 text-sm text-ink-2 outline-none focus:border-brand focus:bg-card pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-muted"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Validaciones */}
          <div className="pt-2 space-y-1.5">
            <p className="text-xs font-bold text-muted mb-2">La contraseña debe contener:</p>
            
            <div className="flex items-center gap-2 text-xs">
              {hasMinLength ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-muted" />
              )}
              <span className={hasMinLength ? 'text-ink-2 font-medium' : 'text-muted'}>
                Mínimo 8 caracteres
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasUpper ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-muted" />
              )}
              <span className={hasUpper ? 'text-ink-2 font-medium' : 'text-muted'}>
                Al menos una mayúscula
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasNumber ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-muted" />
              )}
              <span className={hasNumber ? 'text-ink-2 font-medium' : 'text-muted'}>
                Al menos un número
              </span>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={guardandoPassword}
              className="rounded-xl bg-maroon px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {guardandoPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
