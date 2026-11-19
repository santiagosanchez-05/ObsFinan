import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { campoNombre, campoNombreOpcional, campoCorreo } from './validaciones';

const schema = z.object({
  nombre: campoNombre('El nombre'),
  apellidoMaterno: campoNombreOpcional('El apellido materno'),
  correo: campoCorreo(),
});
const base = { nombre: 'Ana', apellidoMaterno: '', correo: 'ana@gmail.com' };
const valido = (cambios) => schema.safeParse({ ...base, ...cambios }).success;

describe('validaciones compartidas de nombres y correos', () => {
  it.each(['María José', 'Pérez-Gómez', "D'Angelo", 'Núñez'])('acepta el nombre "%s"', (nombre) => {
    expect(valido({ nombre })).toBe(true);
  });

  it.each(['Ana:', 'Juan+', '<script>', 'Ana123', '   '])('rechaza el nombre "%s"', (nombre) => {
    expect(valido({ nombre })).toBe(false);
  });

  it('apellido materno vacío es válido, con símbolos no', () => {
    expect(valido({ apellidoMaterno: '' })).toBe(true);
    expect(valido({ apellidoMaterno: 'Rojas:' })).toBe(false);
  });

  it.each(['ana:perez@gmail.com', 'ana+1@gmail.com', 'ana@gmail', 'ana..p@gmail.com', ''])(
    'rechaza el correo "%s"',
    (correo) => {
      expect(valido({ correo })).toBe(false);
    },
  );

  it('acepta un correo institucional', () => {
    expect(valido({ correo: 'saa0035135@est.univalle.edu' })).toBe(true);
  });
});
