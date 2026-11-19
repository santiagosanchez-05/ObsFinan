const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  // Con una red lenta, sin estos límites la petición quedaba colgada ~2 minutos
  // antes de fallar. Así falla rápido y el error queda en el log del servidor.
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

module.exports = transporter;
