const path = require('path');

// Plantilla común de los avisos por correo. Mismo estilo que los correos de
// bienvenida y de recuperación de contraseña (users/ y auth/emailTemplates.js).
const LOGO_PATH = path.join(__dirname, '..', '..', '..', '..', 'frontend', 'src', 'assets', 'univalleLogo.png');

// Todo lo que viene de usuarios (nombres, títulos, motivos) se escapa antes de
// meterlo en el HTML.
function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {object} p
 * @param {string} p.titulo
 * @param {string[]} [p.parrafos]  texto plano (se escapa)
 * @param {Array<[string, string]>} [p.detalles]  filas "Etiqueta: valor"
 * @param {{ texto: string, url: string }} [p.boton]
 * @param {string} [p.nota]  línea chica al pie
 */
function correoHtml({ titulo, parrafos = [], detalles = [], boton, nota }) {
  const filas = detalles
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([etiqueta, valor]) => `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#6b6b6b;vertical-align:top;width:40%;">${escapar(etiqueta)}</td>
            <td style="padding:6px 0;font-size:13px;color:#1D201E;font-weight:600;">${escapar(valor)}</td>
          </tr>`)
    .join('');

  return `
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <div style="max-width:520px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#F5F7F9;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
      <div style="padding:28px 32px 16px;text-align:center;">
        <img src="cid:univalleLogo" alt="Univalle" width="48" height="48" style="display:block;margin:0 auto 10px;" />
        <p style="margin:0;font-size:16px;font-weight:700;color:#9E0044;">Bienestar Financiero Univalle</p>
      </div>
      <div style="padding:0 32px 28px;">
        <h1 style="font-size:19px;color:#1D201E;margin:0 0 12px;text-align:center;">${escapar(titulo)}</h1>
        ${parrafos.map((p) => `<p style="font-size:14px;color:#4a524f;margin:0 0 12px;line-height:1.55;">${escapar(p)}</p>`).join('')}
        ${filas ? `<table style="width:100%;border-collapse:collapse;background:#F5F7F9;border-radius:12px;margin:8px 0 16px;padding:8px 16px;">${filas}</table>` : ''}
        ${boton ? `<div style="text-align:center;margin-top:20px;"><a href="${escapar(boton.url)}" style="display:inline-block;background:#9E0044;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;">${escapar(boton.texto)}</a></div>` : ''}
      </div>
      <div style="background:#F5F7F9;padding:14px 32px;text-align:center;">
        <p style="font-size:12px;color:#9a9a9a;margin:0;">${escapar(nota || 'Este es un aviso automático del Observatorio de Bienestar Financiero Univalle.')}</p>
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

module.exports = { correoHtml, attachmentLogo, escapar };
