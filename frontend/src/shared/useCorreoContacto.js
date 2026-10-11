import { useEffect, useState } from 'react';

export const CORREO_GENERICO = 'observatorio@univalle.edu';

// Correo de contacto de los footers públicos: el del Superadmin activo más
// antiguo (GET /api/contacto/correo). Mientras carga o si falla, el genérico.
export function useCorreoContacto() {
  const [correo, setCorreo] = useState(CORREO_GENERICO);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => fetch('/api/contacto/correo', { signal: controller.signal }))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.correo) setCorreo(data.correo);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return correo;
}
