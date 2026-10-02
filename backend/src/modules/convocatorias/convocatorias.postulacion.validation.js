const { z } = require('zod');

const postulacionSchema = z.object({
  first_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es demasiado largo'),
  paternal_last_name: z.string().trim().min(2, 'El apellido paterno debe tener al menos 2 caracteres').max(100, 'El apellido es demasiado largo'),
  maternal_last_name: z.string().trim().max(100, 'El apellido materno es demasiado largo').optional().nullable().or(z.literal('')),
  email: z.string().trim().email('Correo electrónico inválido').max(150, 'El correo es demasiado largo'),
  phone: z.string().trim().min(6, 'El teléfono debe tener al menos 6 dígitos').max(30, 'El teléfono es demasiado largo'),
});

module.exports = {
  postulacionSchema,
};
