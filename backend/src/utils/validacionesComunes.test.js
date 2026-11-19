const { z } = require('zod');
const { campoNombre, campoNombreOpcional, campoCorreo } = require('./validacionesComunes');

const schema = z.object({
  nombre: campoNombre('El nombre'),
  apellidoMaterno: campoNombreOpcional('El apellido materno'),
  correo: campoCorreo(),
});
const base = { nombre: 'Ana', apellidoMaterno: '', correo: 'ana.perez@gmail.com' };
const valido = (cambios) => schema.safeParse({ ...base, ...cambios }).success;

describe('campoNombre (hallazgo QA: caracteres especiales en el registro)', () => {
  it.each(['María José', 'Pérez-Gómez', "D'Angelo", 'Núñez', 'Güemes'])('acepta "%s"', (nombre) => {
    expect(valido({ nombre })).toBe(true);
  });

  it.each(['Ana:', 'Juan+', '<script>', 'Ana123', 'José@', 'Ana  -  Luz', '-Ana', "Ana'", '   '])(
    'rechaza "%s"',
    (nombre) => {
      expect(valido({ nombre })).toBe(false);
    },
  );

  it('colapsa espacios repetidos', () => {
    expect(schema.parse({ ...base, nombre: '  Juan    Pablo ' }).nombre).toBe('Juan Pablo');
  });
});

describe('campoNombreOpcional', () => {
  it('acepta vacío, null o ausente', () => {
    expect(valido({ apellidoMaterno: '' })).toBe(true);
    expect(valido({ apellidoMaterno: null })).toBe(true);
    expect(valido({ apellidoMaterno: undefined })).toBe(true);
  });

  it('si trae algo, lo valida igual que un nombre', () => {
    expect(valido({ apellidoMaterno: 'Rojas' })).toBe(true);
    expect(valido({ apellidoMaterno: 'Rojas:' })).toBe(false);
  });
});

describe('campoCorreo (hallazgo QA: el panel Admin aceptaba ":" y "+")', () => {
  it.each(['ana@gmail.com', 'saa0035135@est.univalle.edu', 'ana_perez-1@mi-dominio.com.bo'])('acepta "%s"', (correo) => {
    expect(valido({ correo })).toBe(true);
  });

  it.each([
    'ana:perez@gmail.com',
    'ana+1@gmail.com',
    'ana@gmail',
    'ana@@gmail.com',
    'ana..perez@gmail.com',
    '.ana@gmail.com',
    'ana perez@gmail.com',
    'ana@gmail.c',
    'ana@-gmail.com',
    '',
  ])('rechaza "%s"', (correo) => {
    expect(valido({ correo })).toBe(false);
  });

  it('quita espacios y pasa a minúsculas', () => {
    expect(schema.parse({ ...base, correo: '  Ana@Gmail.COM ' }).correo).toBe('ana@gmail.com');
  });
});
