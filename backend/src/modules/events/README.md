# Módulo Eventos (backend)

Sprint 2. Encargado: **Santiago** (US43–US47, US55). **Kevin Prieto** tiene "Mis eventos" del encuestador (US56) en `events.misEventos.controller.js`.

- `events.routes.js` ya tiene todas las rutas conectadas (se monta solo en `/api/events`).
- Tablas: `event`, `event_surveyor` (asignación evento–encuestador) e `image` (`type = TIPO_IMAGEN.EVENTO`).
- La agenda y el detalle son **públicos**. Crear/editar/eliminar/asignar: Admin (solo su sede) y Superadmin — usar `requireSedeDelRecurso` de `middlewares/sede.middleware.js`.

Más detalle: **`docs/SPRINT2.md`**.
