# Módulo Sedes (backend)

Encargado: **Kevin Alanes** (ver `GUIA_EQUIPO.docx` / backlog Sprint 1, US15).

Cuando empieces, creá acá adentro:

- `sedes.routes.js` — se monta solo en `/api/sedes` (ver `src/config/loadRoutes.js`, no hay que tocarlo).
- `sedes.controller.js`, `sedes.service.js` — mismo patrón que `src/modules/auth/`.

Endpoint esperado:

- `GET /api/sedes/stats` — datos para los gráficos comparativos del dashboard de sedes, con filtro por sede.

Protegé la ruta con `requireAuth` + `requireRole('superadmin')` desde `src/middlewares/auth.middleware.js` (solo Superadmin ve este dashboard).
