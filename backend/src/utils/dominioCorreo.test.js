jest.mock('dns', () => ({
  promises: { resolveMx: jest.fn(), resolve4: jest.fn(), resolve6: jest.fn() },
}));

let dns;

const errorDns = (code) => Object.assign(new Error(code), { code });

describe('dominioRecibeCorreo', () => {
  let dominioRecibeCorreo;
  const entornoOriginal = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development'; // en 'test' la función no consulta el DNS
    dns = require('dns').promises; // misma instancia del mock que usa el módulo tras resetModules
    ({ dominioRecibeCorreo } = require('./dominioCorreo'));
  });

  afterAll(() => {
    process.env.NODE_ENV = entornoOriginal;
  });

  it('acepta un dominio con registros MX', async () => {
    dns.resolveMx.mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 5 }]);
    await expect(dominioRecibeCorreo('ana@gmail.com')).resolves.toBe(true);
  });

  it('rechaza un dominio inventado', async () => {
    dns.resolveMx.mockRejectedValue(errorDns('ENOTFOUND'));
    dns.resolve4.mockRejectedValue(errorDns('ENOTFOUND'));
    dns.resolve6.mockRejectedValue(errorDns('ENOTFOUND'));
    await expect(dominioRecibeCorreo('ana@asdfqwerzx.com')).resolves.toBe(false);
  });

  it('sin MX pero con registro A, lo acepta (RFC 5321)', async () => {
    dns.resolveMx.mockRejectedValue(errorDns('ENODATA'));
    dns.resolve4.mockResolvedValue(['1.2.3.4']);
    await expect(dominioRecibeCorreo('ana@ejemplo.com')).resolves.toBe(true);
  });

  it('si falla la red, no bloquea el registro', async () => {
    dns.resolveMx.mockRejectedValue(errorDns('ECONNREFUSED'));
    await expect(dominioRecibeCorreo('ana@gmail.com')).resolves.toBe(true);
  });

  it('en NODE_ENV=test no consulta el DNS', async () => {
    process.env.NODE_ENV = 'test';
    await expect(dominioRecibeCorreo('ana@lo-que-sea.com')).resolves.toBe(true);
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });
});
