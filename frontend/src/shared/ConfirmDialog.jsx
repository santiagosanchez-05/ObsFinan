/**
 * Modal de confirmación genérico — hoy lo usa "Cerrar sesión", pero sirve
 * para cualquier acción irreversible futura (dar de baja usuario, etc.).
 */
export default function ConfirmDialog({
  open,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
        {mensaje && <p className="mt-2 text-sm text-ink/60">{mensaje}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-light"
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
