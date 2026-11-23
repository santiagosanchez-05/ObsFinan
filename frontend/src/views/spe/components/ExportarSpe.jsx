import { useState } from 'react';
import { FileSpreadsheet, FileCode, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext';

function headersDe(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ExportarSpe({ filtros }) {
  const { token } = useAuth();
  const [descargando, setDescargando] = useState(null); // 'csv' | 'json' | null
  const [error, setError] = useState(null);

  const manejarDescarga = async (formato) => {
    try {
      setDescargando(formato);
      setError(null);

      const params = new URLSearchParams();
      params.set('formato', formato);

      if (filtros) {
        if (filtros.year) params.set('year', filtros.year);
        if (filtros.semester) params.set('semester', filtros.semester);
        if (filtros.department) params.set('department', filtros.department);
        if (filtros.sector) params.set('sector', filtros.sector);
        if (filtros.size) params.set('size', filtros.size);
      }

      const res = await fetch(`/api/spe/export?${params.toString()}`, {
        headers: headersDe(token),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudo descargar el dataset');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');

      const disposicion = res.headers.get('Content-Disposition') || '';
      const coincidencia = disposicion.match(/filename="(.+)"/);
      const fechaActual = new Date().toISOString().split('T')[0];

      enlace.download = coincidencia ? coincidencia[1] : `dataset_spe_${fechaActual}.${formato}`;
      enlace.href = url;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar SPE:', err);
      setError(err.message || 'Error al descargar datos');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => manejarDescarga('xlsx')}
          disabled={Boolean(descargando)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-surface transition-colors disabled:opacity-50"
          title="Descargar datos filtrados en formato Excel"
        >
          {descargando === 'xlsx' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>Exportar Excel</span>
        </button>

        <button
          type="button"
          onClick={() => manejarDescarga('json')}
          disabled={Boolean(descargando)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-surface transition-colors disabled:opacity-50"
          title="Descargar datos filtrados en formato JSON"
        >
          {descargando === 'json' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
          ) : (
            <FileCode className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          )}
          <span>Exportar JSON</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
