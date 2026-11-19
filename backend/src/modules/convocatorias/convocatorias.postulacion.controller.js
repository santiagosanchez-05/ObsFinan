// Kevin Prieto — US52 (formulario público de postulación).
// Solo se acepta si la convocatoria está vigente (hoy entre start_date y end_date).
// La postulación entra a applicant con status = ESTADO_POSTULANTE.PENDIENTE.
const postulacionService = require('./convocatorias.postulacion.service');
const { postulacionSchema } = require('./convocatorias.postulacion.validation');
const { dominioRecibeCorreo, MENSAJE_DOMINIO_INVALIDO } = require('../../utils/dominioCorreo');

async function getConvocatoriasAbiertas(req, res) {
  try {
    const convocatorias = await postulacionService.obtenerConvocatoriasAbiertas();
    return res.status(200).json(convocatorias);
  } catch (err) {
    console.error('Error al obtener convocatorias abiertas:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las convocatorias abiertas' });
  }
}

async function postPostulacion(req, res) {
  const convocationId = Number(req.params.id);
  if (!Number.isInteger(convocationId) || convocationId <= 0) {
    return res.status(400).json({ error: 'Id de convocatoria inválido' });
  }

  const validacion = postulacionSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({
      error: 'Datos de postulación inválidos',
      detalles: validacion.error.flatten(),
    });
  }
  if (!(await dominioRecibeCorreo(validacion.data.email))) {
    return res.status(400).json({
      error: MENSAJE_DOMINIO_INVALIDO,
      detalles: { formErrors: [], fieldErrors: { email: [MENSAJE_DOMINIO_INVALIDO] } },
    });
  }

  try {
    const applicantId = await postulacionService.registrarPostulacion({
      convocationId,
      datos: validacion.data,
    });

    return res.status(201).json({
      message: 'Postulación registrada con éxito',
      applicantId,
    });
  } catch (err) {
    if (err.message === 'CONVOCATORIA_NO_ENCONTRADA') {
      return res.status(404).json({ error: 'La convocatoria especificada no existe' });
    }
    if (err.message === 'CONVOCATORIA_CERRADA') {
      return res.status(400).json({ error: 'La convocatoria no se encuentra abierta para postulaciones' });
    }
    if (err.message === 'POSTULACION_DUPLICADA') {
      return res.status(409).json({ error: 'Ya existe una postulación registrada con este correo para esta convocatoria' });
    }
    console.error('Error al registrar postulación:', err);
    return res.status(500).json({ error: 'No se pudo registrar la postulación' });
  }
}

module.exports = {
  getConvocatoriasAbiertas,
  postPostulacion,
};
