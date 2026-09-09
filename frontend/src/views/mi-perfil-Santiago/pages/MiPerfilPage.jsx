import React, { useState } from 'react';
import { Camera, Lock, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';

export default function MiPerfilPage() {
  const [nombres, setNombres] = useState('Carlos Eduardo');
  const [apellidoPaterno, setApellidoPaterno] = useState('Mendez');
  const [apellidoMaterno, setApellidoMaterno] = useState('Rojas');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  // 1. Manejo del botón Guardar Cambios (Modo Simulación)
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setTimeout(() => {
      alert('¡Perfil actualizado con éxito!');
    }, 300);
  };

  // 2. Manejo del botón Actualizar Contraseña (Modo Simulación)
  const handleUpdatePassword = (e) => {
    e.preventDefault();

    if (!hasMinLength || !hasUpper || !hasNumber) {
      alert('La nueva contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setTimeout(() => {
      alert('¡Contraseña actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 300);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Administra tu información personal y tu contraseña
        </p>
      </div>

      {/* TARJETA 1: Información Personal */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Información personal</h2>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar con enlace de la imagen */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="https://png.pngtree.com/thumb_back/fh260/background/20250512/pngtree-a-happy-bald-man-in-suit-and-tie-smiling-at-the-image_17286431.jpg"
                alt="Foto de perfil"
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-white shadow hover:opacity-90"
              >
                <Camera size={14} />
              </button>
            </div>
            <div>
              <button
                type="button"
                className="font-bold text-maroon hover:underline text-sm"
              >
                Cambiar foto
              </button>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG o GIF. Máximo 1MB.</p>
            </div>
          </div>

          {/* Campo: Nombres */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nombres
            </label>
            <input
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white"
            />
          </div>

          {/* Campos: Apellidos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Apellido paterno
              </label>
              <input
                type="text"
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Apellido materno
              </label>
              <input
                type="text"
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white"
              />
            </div>
          </div>

          {/* Información Restringida */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-wider">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[10px] font-bold text-white">
                i
              </span>
              INFORMACIÓN RESTRINGIDA
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Correo electrónico</span>
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  carlos.mendez@univalle.edu <Lock size={12} className="text-slate-400" />
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Rol</span>
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  Superadmin <Lock size={12} className="text-slate-400" />
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Sede</span>
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  Cochabamba <Lock size={12} className="text-slate-400" />
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Estado</span>
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Activo <Lock size={12} className="text-slate-400" />
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              Estos datos solo pueden ser modificados por un administrador del sistema.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-xl bg-maroon px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* TARJETA 2: Cambiar Contraseña */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Cambiar contraseña</h2>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-maroon focus:bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Validaciones */}
          <div className="pt-2 space-y-1.5">
            <p className="text-xs font-bold text-slate-500 mb-2">La contraseña debe contener:</p>
            
            <div className="flex items-center gap-2 text-xs">
              {hasMinLength ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-slate-300" />
              )}
              <span className={hasMinLength ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Mínimo 8 caracteres
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasUpper ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-slate-300" />
              )}
              <span className={hasUpper ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Al menos una mayúscula
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasNumber ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <Circle size={14} className="text-slate-300" />
              )}
              <span className={hasNumber ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Al menos un número
              </span>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="rounded-xl bg-maroon px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
            >
              Actualizar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}