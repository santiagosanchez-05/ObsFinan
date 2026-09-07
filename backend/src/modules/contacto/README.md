# Módulo Contacto (backend)

Encargado: **Kevin Prieto** (ver `GUIA_EQUIPO.docx` / backlog Sprint 1, US32).

Cuando empieces, creá acá adentro:

- `contacto.routes.js` — se monta solo en `/api/contacto` (ver `src/config/loadRoutes.js`, no hay que tocarlo).
- `contacto.controller.js`, `contacto.service.js`, `contacto.validation.js` — mismo patrón que `src/modules/auth/`.

Endpoint esperado:

- `POST /api/contacto` — recibe { nombre, correo, institución, mensaje } (validar con Zod) y lo envía por correo con Nodemailer (ver `src/config/mailer.js`, ya configurado y listo para reusar).

Esta ruta es pública (no requiere login) — no le pongas `requireAuth`.
