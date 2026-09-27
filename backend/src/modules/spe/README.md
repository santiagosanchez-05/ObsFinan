# Módulo SPE — Sector Privado Exportador (backend)

Sprint 2. Módulo compartido por **Liz, Monserrat, Kevin Prieto y Kevin Alanes**: cada uno tiene sus propios archivos (el encabezado de cada archivo dice de quién es y qué historia cubre).

- `spe.routes.js` ya tiene **todas** las rutas conectadas (se monta solo en `/api/spe`). No hace falta tocarlo.
- Encuesta: **ENCUESTA ÚNICA INTEGRADA SOCOMEX–SOCIFIN** (8 secciones, unas 70 preguntas).
- Tablas: `spe_survey_response` (una fila por empresa encuestada, columnas `s1_…` a `s8_…` por sección), atada a `data_load` (`module = MODULO.SPE`); y `spe_index_score` (IEE, ICE, IIE e ICIE de cada empresa, los calcula US63).
- El dashboard es **público**; la gestión es **solo Superadmin** (el SPE es nacional). Las encuestas de encuestadores entran **pendientes** y las aprueba un Superadmin.

Tabla de quién hace qué, contratos entre piezas y convenciones: **`docs/SPRINT2.md`**.
