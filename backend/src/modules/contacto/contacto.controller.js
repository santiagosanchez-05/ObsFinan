const contactoService = require('./contacto.service');
const { contactoSchema } = require('./contacto.validation');

async function getSedesContacto(req, res) {
  try {
    const sedes = await contactoService.obtenerSedesActivas();
    return res.json(sedes);
  } catch (err) {
    console.error('Error al obtener sedes para contacto:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las sedes' });
  }
}

async function postContacto(req, res) {
  const parsed = contactoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    await contactoService.enviarMensajeContacto(parsed.data);
    return res.json({ message: 'Mensaje enviado correctamente al administrador de la sede.' });
  } catch (err) {
    if (err.message === 'SEDE_NO_ENCONTRADA') {
      return res.status(400).json({ error: 'La sede seleccionada no existe o no está activa' });
    }
    console.error('Error enviando mensaje de contacto:', err);
    return res.status(500).json({ error: 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.' });
  }
}

async function getCorreoContacto(req, res) {
  try {
    const correo = await contactoService.obtenerCorreoContacto();
    return res.json({ correo });
  } catch (err) {
    console.error('Error al obtener el correo de contacto:', err);
    return res.status(500).json({ error: 'No se pudo obtener el correo de contacto' });
  }
}

module.exports = { getSedesContacto, postContacto, getCorreoContacto };
