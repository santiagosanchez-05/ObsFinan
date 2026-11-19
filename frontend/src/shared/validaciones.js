// Reglas compartidas para nombres y correos (mismas que el backend en
// backend/src/utils/validacionesComunes.js). El backend vuelve a validar.
import { z } from 'zod';

// Letras (con tildes, diéresis y ñ), separadas por un espacio, guion o apóstrofo.
export const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

// Sin "+", ":", espacios ni puntos dobles; dominio con TLD de al menos 2 letras.
export const CORREO_REGEX = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*@(?:[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.)+[A-Za-z]{2,}$/;

const MENSAJE_NOMBRE = 'solo puede contener letras, espacios, guiones o apóstrofos';

const normalizar = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v);

export function campoNombre(etiqueta, { max = 100 } = {}) {
  return z.preprocess(
    normalizar,
    z
      .string()
      .min(1, `${etiqueta} es obligatorio`)
      .max(max, `${etiqueta} es demasiado largo`)
      .regex(NOMBRE_REGEX, `${etiqueta} ${MENSAJE_NOMBRE}`),
  );
}

export function campoNombreOpcional(etiqueta, { max = 100 } = {}) {
  return z.preprocess(
    normalizar,
    z
      .string()
      .max(max, `${etiqueta} es demasiado largo`)
      .refine((v) => v === '' || NOMBRE_REGEX.test(v), `${etiqueta} ${MENSAJE_NOMBRE}`)
      .optional(),
  );
}

export function campoCorreo({ max = 150 } = {}) {
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z
      .string()
      .min(1, 'El correo es obligatorio')
      .max(max, 'El correo es demasiado largo')
      .regex(CORREO_REGEX, 'Correo inválido'),
  );
}
