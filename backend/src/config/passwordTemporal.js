// Formato único de contraseña temporal en todo el sistema: UVL-XXXXXX
// (6 caracteres alfanuméricos). Se usa al crear un usuario nuevo (Registro
// Users) y acá se reutiliza para RECHAZAR que alguien elija una contraseña
// nueva con esa misma pinta.
const FORMATO_TEMPORAL_REGEX = /^UVL-[A-Za-z0-9]{6}$/i;

function generarPasswordTemporal() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let sufijo = '';
  for (let i = 0; i < 6; i++) {
    sufijo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return `UVL-${sufijo}`;
}

module.exports = { FORMATO_TEMPORAL_REGEX, generarPasswordTemporal };
