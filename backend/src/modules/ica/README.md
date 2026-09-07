# Módulo ICA (backend)

Encargadas: **Liz** y **Monserrat** (ver `GUIA_EQUIPO.docx` / el backlog Sprint 1, US16–US24 y US28–US30).

Cuando empieces, creá acá adentro:

- `ica.routes.js` — se monta solo en `/api/ica` (ver `src/config/loadRoutes.js`, no hay que tocarlo).
- `ica.controller.js`, `ica.service.js`, `ica.validation.js` — mismo patrón que `src/modules/auth/`.

Endpoints esperados (repartidos entre Liz y Monserrat según el backlog):

- `GET /api/ica` — dashboard + filtros (comuna, trimestre, dimensión, sede, género)
- `POST /api/ica` — registro individual
- `POST /api/ica/upload` — registro por archivo (Multer + xlsx)
- `GET /api/ica/historial` — historial de cargas
- `GET /api/ica/export?formato=csv|json` — descarga de dataset
- `GET /api/ica/files/:id` — detalle de un archivo cargado
- `DELETE /api/ica/:id` y `DELETE /api/ica/files/:id` — baja de registros

Recordá usar `requireAuth`/`requireRole` de `src/middlewares/auth.middleware.js` en las rutas que correspondan (Superadmin/Admin para escritura, cualquier rol logueado para lectura).
