// Verifica que el dominio de un correo exista y pueda recibir correos
// (registros MX, o A/AAAA como respaldo según RFC 5321). Evita registrar
// cuentas con correos inventados como "x@asdfgh.com".
//
// - Si el DNS responde que el dominio no existe o no tiene servidor de correo,
//   devuelve false.
// - Si la consulta falla por otra causa (sin internet, timeout), devuelve true
//   para no bloquear el registro por un problema de red.
// - En pruebas automáticas (NODE_ENV=test) no consulta el DNS.
const dns = require('dns').promises;

const SIN_DOMINIO = new Set(['ENOTFOUND', 'ENODATA', 'ENONAME', 'NXDOMAIN']);
const cache = new Map(); // dominio -> { ok, expira }
const TTL_MS = 60 * 60 * 1000;

function conTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms)),
  ]);
}

async function tieneRegistros(fn, dominio) {
  try {
    const r = await conTimeout(fn(dominio), 5000);
    return Array.isArray(r) && r.length > 0;
  } catch (err) {
    if (SIN_DOMINIO.has(err.code)) return false;
    throw err;
  }
}

async function dominioRecibeCorreo(correo) {
  if (process.env.NODE_ENV === 'test') return true;
  const dominio = String(correo).split('@')[1]?.toLowerCase();
  if (!dominio) return false;

  const enCache = cache.get(dominio);
  if (enCache && enCache.expira > Date.now()) return enCache.ok;

  let ok;
  try {
    ok =
      (await tieneRegistros(dns.resolveMx, dominio)) ||
      (await tieneRegistros(dns.resolve4, dominio)) ||
      (await tieneRegistros(dns.resolve6, dominio));
  } catch (err) {
    console.warn(`No se pudo verificar el dominio ${dominio} (${err.code || err.message}); se permite el registro.`);
    return true;
  }
  cache.set(dominio, { ok, expira: Date.now() + TTL_MS });
  return ok;
}

const MENSAJE_DOMINIO_INVALIDO = 'El dominio del correo no existe o no puede recibir correos';

module.exports = { dominioRecibeCorreo, MENSAJE_DOMINIO_INVALIDO };
