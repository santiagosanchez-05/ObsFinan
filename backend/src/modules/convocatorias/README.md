# Módulo Convocatorias (backend)

Sprint 2. **Kevin Alanes** (US50 crear, US53 postulantes) en `convocatorias.gestion.controller.js`; **Kevin Prieto** (US51 listado, US52 postulación pública) en `convocatorias.listado.controller.js` y `convocatorias.postulacion.controller.js`.

- `convocatorias.routes.js` ya tiene todas las rutas conectadas (se monta solo en `/api/convocatorias`).
- Tablas: `convocation` (por sede, con `start_date`/`end_date`) y `applicant` (`status` según `ESTADO_POSTULANTE`).
- La postulación es **pública** y tiene límite de envíos por IP. Al aprobar un postulante se le crea la cuenta de encuestador con `registrarUsuario` (`modules/users/users.service.js`).

Más detalle: **`docs/SPRINT2.md`**.
