# Módulo Eventos (backend)

Sprint 2. Encargado: **Santiago** (US43–US47, US55). **Kevin Prieto** tiene "Mis eventos" del encuestador (US56) en `events.misEventos.controller.js`.

- `events.routes.js` ya tiene todas las rutas conectadas (se monta solo en `/api/events`).
- Tablas: `event`, `event_surveyor` (asignación evento–encuestador) e `image` (`type = TIPO_IMAGEN.EVENTO`).
- La agenda y el detalle son **públicos**. Crear/editar/eliminar/asignar: Admin (solo su sede) y Superadmin — usar `requireSedeDelRecurso` de `middlewares/sede.middleware.js`.

Más detalle: **`docs/SPRINT2.md`**.
- El encuestador se anota solo (sin límite) con `POST /api/events/:id/participacion` y se baja con `DELETE`: solo eventos de su sede, con encuesta (`has_ica` o `has_spe`) y que no hayan pasado. Usa la misma tabla `event_surveyor` que la asignación del Admin.
- Asignación por el Admin/Superadmin (US55): `GET /api/events/:id/encuestadores` devuelve `{ evento, asignados, disponibles }` (asignados marca `seAnotoSolo`; disponibles = encuestadores activos de la sede del evento sin asignar). `POST` con `{ userId }` asigna y `DELETE /:userId` quita (baja lógica). Solo eventos con encuesta y que no hayan pasado.
