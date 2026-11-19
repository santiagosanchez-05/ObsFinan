// Reglas de validación compartidas para nombres y correos.
// Corrige los hallazgos de QA: se aceptaban caracteres especiales (":", "+",
// "<", etc.) en nombres y apellidos, y correos con formato poco realista.
const { z } = require('zod');

// Letras (con tildes, diéresis y ñ), separadas por un espacio, guion o apóstrofo.
// Ejemplos válidos: "María José", "Pérez-Gómez", "D'Angelo".
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

// Parte local: letras y números separados por ".", "_" o "-" (sin "+", ":", espacios ni puntos dobles).
// Dominio: etiquetas alfanuméricas con guiones internos y un TLD de al menos 2 letras.
const CORREO_REGEX = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*@(?:[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.)+[A-Za-z]{2,}$/;

const MENSAJE_NOMBRE = 'solo puede contener letras, espacios, guiones o apóstrofos';

// Colapsa espacios repetidos antes de validar ("Juan   Pablo" -> "Juan Pablo").
const normalizar = (valor) => (typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : valor);

function campoNombre(etiqueta, { min = 1, max = 100 } = {}) {
  return z.preprocess(
    normalizar,
    z
      .string({ message: `${etiqueta} es obligatorio` })
      .min(min, min > 1 ? `${etiqueta} debe tener al menos ${min} caracteres` : `${etiqueta} es obligatorio`)
      .max(max, `${etiqueta} es demasiado largo`)
      .regex(NOMBRE_REGEX, `${etiqueta} ${MENSAJE_NOMBRE}`),
  );
}

// Para campos opcionales (apellido materno): vacío permitido; si trae algo, se valida igual.
function campoNombreOpcional(etiqueta, { max = 100 } = {}) {
  return z.preprocess(
    normalizar,
    z
      .string()
      .max(max, `${etiqueta} es demasiado largo`)
      .refine((v) => v === '' || NOMBRE_REGEX.test(v), `${etiqueta} ${MENSAJE_NOMBRE}`)
      .optional()
      .nullable(),
  );
}

function campoCorreo(mensaje = 'Correo inválido', { max = 150 } = {}) {
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z
      .string({ message: 'El correo es obligatorio' })
      .min(1, 'El correo es obligatorio')
      .max(max, 'El correo es demasiado largo')
      .regex(CORREO_REGEX, mensaje),
  );
}

module.exports = { NOMBRE_REGEX, CORREO_REGEX, campoNombre, campoNombreOpcional, campoCorreo };
