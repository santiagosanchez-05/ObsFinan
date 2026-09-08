const path = require('path');

// Mismo estilo que el correo de "Olvidé mi contraseña" (backend/src/modules/auth/emailTemplates.js) —
// duplicado acá (no importado desde auth/) para que este módulo no dependa de otro.
const LOGO_PATH = path.join(__dirname, '..', '..', '..', '..', 'frontend', 'src', 'assets', 'univalleLogo.png');

function bienvenidaHtml(nombre, passwordTemporal) {
  return `
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <div style="max-width:480px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#F5F7F9;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
      <div style="padding:32px 32px 24px;text-align:center;">
        <img src="cid:univalleLogo" alt="Univalle" width="56" height="56" style="display:block;margin:0 auto 12px;" />
        <p style="margin:0;font-size:18px;font-weight:700;color:#9E0044;">Bienestar Financiero Univalle</p>
      </div>
      <div style="padding:0 32px 32px;text-align:center;">
        <h1 style="font-size:20px;color:#1D201E;margin:0 0 8px;">¡Bienvenido/a, ${nombre}!</h1>
        <p style="font-size:14px;color:#6b6b6b;margin:0 0 24px;line-height:1.5;">
          Se creó tu cuenta en el Observatorio de Bienestar Financiero Univalle. Usá la siguiente contraseña temporal para iniciar sesión:
        </p>
        <div style="background:#F5F7F9;border-radius:12px;padding:20px;margin-bottom:24px;">
          <span style="font-size:26px;font-weight:700;letter-spacing:2px;color:#9E0044;">${passwordTemporal}</span>
        </div>
        <p style="font-size:13px;color:#6b6b6b;margin:0;">
          Por seguridad, cambiala apenas inicies sesión por primera vez.
        </p>
      </div>
      <div style="background:#F5F7F9;padding:16px 32px;text-align:center;">
        <p style="font-size:12px;color:#9a9a9a;margin:0;">
          Si no esperabas este correo, contactá al administrador del observatorio.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin-top:16px;">
      © ${new Date().getFullYear()} Universidad Privada del Valle
    </p>
  </div>`;
}

function attachmentLogo() {
  return [{ filename: 'univalleLogo.png', path: LOGO_PATH, cid: 'univalleLogo', contentDisposition: 'inline' }];
}

module.exports = { bienvenidaHtml, attachmentLogo };
