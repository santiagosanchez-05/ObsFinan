const { z } = require('zod');
const { campoNombre, campoNombreOpcional, campoCorreo } = require('../../utils/validacionesComunes');

const postulacionSchema = z.object({
  first_name: campoNombre('El nombre', { min: 2 }),
  paternal_last_name: campoNombre('El apellido paterno', { min: 2 }),
  maternal_last_name: campoNombreOpcional('El apellido materno'),
  email: campoCorreo('Correo electrónico inválido'),
  phone: z.string().trim().min(6, 'El teléfono debe tener al menos 6 dígitos').max(30, 'El teléfono es demasiado largo'),
});

module.exports = {
  postulacionSchema,
};
