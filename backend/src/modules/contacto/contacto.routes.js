const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../../config/db'); // Ajusta la ruta a tu conexión DB si es diferente

// Configuración del transporter de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

// Endpoint público: POST /api/contacto
router.post('/', async (req, res) => {
  try {
    const { nombre, correo, sedeId, asunto, mensaje } = req.body;

    if (!nombre || !correo || !asunto || !mensaje || !sedeId) {
      return res.status(400).json({ 
        message: 'Todos los campos son obligatorios.' 
      });
    }

    let adminEmail = process.env.MAIL_USER; // Email de respaldo

    // 1. Consultar en la BD el admin activo de la sede seleccionada
    try {
      const query = `
        SELECT u.email 
        FROM user u 
        JOIN userrole r ON r.role_id = u.role_id 
        WHERE u.campus_id = ? 
          AND (r.role_name = 'admin' OR r.role_name = 'ADMIN' OR r.role_id = 1) 
          AND u.status = 1 
        LIMIT 1;
      `;
      const [rows] = await db.query(query, [sedeId]);
      
      if (rows && rows.length > 0 && rows[0].email) {
        adminEmail = rows[0].email;
      }
    } catch (dbErr) {
      console.warn('No se pudo obtener el admin por sede desde la BD, usando correo por defecto:', dbErr.message);
    }

    console.log(`Enviando mensaje de contacto de ${correo} al admin (${adminEmail}) de la sede ${sedeId}`);

    // 2. Enviar el correo mediante Nodemailer
    const mailOptions = {
      from: `"${nombre}" <${process.env.MAIL_USER}>`,
      replyTo: correo,
      to: adminEmail,
      subject: `[Contacto Sede ${sedeId}] ${asunto}`,
      html: `
        <h3>Nuevo mensaje de contacto</h3>
        <p><strong>De:</strong> ${nombre} (${correo})</p>
        <p><strong>Sede seleccionada ID:</strong> ${sedeId}</p>
        <p><strong>Asunto:</strong> ${asunto}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      message: 'Mensaje enviado correctamente al administrador de la sede.' 
    });
  } catch (error) {
    console.error('Error enviando mensaje de contacto:', error);
    return res.status(500).json({ 
      message: 'Error interno del servidor al enviar el correo.' 
    });
  }
});

module.exports = router;