# Sprint 2 — Guía del equipo

La base de Sprint 2 ya está armada: **todas las rutas (backend y frontend) existen y están conectadas**. Cada endpoint pendiente responde `501 Pendiente: USxx (Encargado)` y cada pantalla pendiente muestra un placeholder con su historia y su encargado. Para implementar tu historia **solo tocas tus propios archivos**.

## Antes de empezar

1. Trae la base: `git checkout <tu-rama>` → `git merge Dev`.
2. Busca tus archivos en las tablas de abajo (o busca tu nombre en el código: cada archivo dice de quién es).
3. Reemplaza `pendiente('USxx', 'Nombre')` por tu función y el placeholder por tu pantalla.
4. Escribe tus tests en **tu propio archivo** (`<modulo>.<funcionalidad>.test.js` / `<Pantalla>.test.jsx`). No agregues tests a los `*.routes.test.js`: son del andamiaje.
5. Corre todo antes de mergear: `backend: npx jest --runInBand` · `frontend: npx vitest run --maxWorkers=2` y `npm run lint`.

## Reglas para no pisarnos

- **No edites archivos de otros.** Si necesitas algo de otra persona (una función, un cambio de ruta), pídeselo.
- **Archivos compartidos — no tocar sin avisar a Santiago:** `backend/src/config/*`, `backend/src/middlewares/*`, `backend/src/utils/*`, los `*.routes.js` de cada módulo, `frontend/src/app/router.jsx`, `frontend/src/shared/*` (navConfig, Layout, Navbar, AuthContext…) y los `*.routes.jsx`.
- **Usa las constantes de `backend/src/config/estados.js`**, nunca números sueltos (`ESTADO_CARGA.APROBADA`, no `2`).
- **Sede:** usa `backend/src/middlewares/sede.middleware.js` en vez de comparar `campusId` a mano:
  - `sedeDeGestion(req)` → para listados (Superadmin: todas o la del `?campusId=`; Admin: la suya).
  - `requireSedeDelRecurso(fn)` → middleware para rutas `/:id` (404 si no existe, 403 si es de otra sede).
  - `puedeGestionarSede(user, campusId)` → para validar un `campusId` que viene en el body.
- **Endpoints públicos** (sin login) usan `optionalAuth`. En el frontend, sin sesión **no mandes** el header `Authorization` (ver `headersDe` en `ICAPage.jsx`).
- Si cambias algo que otros usan (un contrato de abajo), avisa en el grupo antes de mergear.

## Convenciones de la BD (`config/estados.js`)

| Columna | Valores |
|---|---|
| `status` de casi todas las tablas | 0 inactivo / eliminado · 1 activo |
| `data_load.status` (aprobación de encuestas y archivos) | 0 eliminada · 1 **pendiente** · 2 **aprobada** · 3 **rechazada** |
| `applicant.status` | 0 eliminado · 1 pendiente · 2 aprobado · 3 rechazado |
| `event.modality` | 1 presencial · 2 virtual · 3 híbrido |
| `data_load.module` | 1 ICA · 2 SPE |
| `data_load.source_type` | 1 individual · 2 archivo |
| `image.type` | `'user'` · `'event'` |
| `spe_survey_response.semester` | 1 · 2 |
| `event.has_ica` / `event.has_spe` (pendientes de crear) | 0 no · 1 sí (pueden ser las dos) |

Lo que carga un **Admin/Superadmin** entra **aprobado** (2). Lo que manda un **Encuestador** entra **pendiente** (1) y recién cuenta en los dashboards cuando se aprueba.

## Quién hace qué — backend

| Historia | Encargado | Endpoint | Archivo |
|---|---|---|---|
| US33 Filtros SPE | Monserrat | (dentro de `GET /api/spe`) | `modules/spe/spe.filtros.js` |
| US34, US35 Dashboard SPE (US34 = filtro por sector exportador) | Liz | `GET /api/spe` (público) | `spe.dashboard.controller.js` + `spe.dashboard.service.js` |
| US36 Insights SPE | Kevin Alanes | (dentro de `GET /api/spe`) | `spe.insights.service.js` |
| US37 Registro individual SPE | Liz | `POST /api/spe` | `spe.registro.controller.js` |
| US38, US39 Carga y historial SPE | Monserrat | `POST /api/spe/upload`, `GET /api/spe/historial` | `spe.carga.controller.js` |
| US40, US41, US42 Descarga, detalle y baja SPE | Kevin Prieto | `GET /api/spe/export` (público), `GET/DELETE /api/spe/files/:id`, `DELETE /api/spe/:id` | `spe.archivos.controller.js` |
| US62 Aprobación SPE | Monserrat | `GET /api/spe/pendientes`, `PATCH /api/spe/cargas/:id/estado` | `spe.aprobacion.controller.js` |
| US63 Índices SOCOMEX/SOCIFIN | Liz | (lo llama la aprobación) | `spe.indices.service.js` |
| US66 Encuesta SPE (encuestador) | Kevin Alanes | `POST /api/spe/encuestas` | `spe.encuestador.controller.js` |
| US43–US47, US55 Eventos | Santiago | `GET /api/events` y `GET /api/events/:id` (públicos), `POST/PATCH/DELETE /api/events`, `/api/events/:id/encuestadores` | `modules/events/events.controller.js` |
| US56 Mis eventos | Kevin Prieto | `GET /api/events/mis-eventos` | `events.misEventos.controller.js` |
| US50, US53 Crear convocatoria y gestionar postulantes | Kevin Alanes | `POST /api/convocatorias`, `GET /api/convocatorias/:id/postulaciones`, `PATCH /api/convocatorias/postulaciones/:id` | `modules/convocatorias/convocatorias.gestion.controller.js` |
| US51 Listado de convocatorias | Kevin Prieto | `GET /api/convocatorias` | `convocatorias.listado.controller.js` |
| US52 Postulación pública | Kevin Prieto | `GET /api/convocatorias/abiertas`, `POST /api/convocatorias/:id/postulaciones` (públicos) | `convocatorias.postulacion.controller.js` |
| US54 Registro directo de encuestador | Kevin Alanes | `POST /api/users/encuestadores` | `modules/users/users.encuestadores.controller.js` |
| US57 Encuesta ICA (encuestador) | Liz | `POST /api/ica/entrevistas` (ya existe: sumar el rol encuestador y el `event_id`) | archivos de ICA |
| US58, US59 Bandeja y aprobación ICA | Monserrat | `GET /api/ica/pendientes`, `PATCH /api/ica/cargas/:id/estado` | `modules/ica/ica.aprobacion.controller.js` |
| US60 Cálculo automático ICA | Liz | (lo llama la aprobación) | `modules/ica/ica.scoring.service.js` |
| US61 Estado de mis encuestas | Kevin Prieto | `GET /api/encuestas/mias` | `modules/encuestas/encuestas.controller.js` |
| US65 Control de acceso por sede | Santiago | — | `middlewares/sede.middleware.js` (ya hecho; falta aplicarlo a ICA) |

Los servicios y validaciones de cada historia los crea su encargado con el mismo nombre que su controlador (ej. `spe.carga.service.js`, `spe.carga.validation.js`).

## Quién hace qué — frontend

| Historia | Encargado | Ruta | Archivo |
|---|---|---|---|
| US35 Dashboard SPE | Liz | `/spe` (público) | `views/spe/pages/SPEPage.jsx` |
| US33 / US36 / US40 (piezas del dashboard SPE) | Monserrat / Kevin Alanes / Kevin Prieto | — | `views/spe/components/FiltrosSpe.jsx` / `InsightsSpe.jsx` / `ExportarSpe.jsx` |
| US37 Registro individual SPE | Liz | `/spe/registrar` | `views/spe/pages/RegistrarSpePage.jsx` |
| US38, US39 Historial y carga SPE | Monserrat | `/spe/historial` | `views/spe/pages/HistorialSpePage.jsx` |
| US41 Detalle de archivo SPE | Kevin Prieto | `/spe/historial/:id` | `views/spe/pages/DetalleArchivoSpePage.jsx` |
| US43–US47, US55 Eventos | Santiago | `/eventos`, `/eventos/:id` (públicos), `/eventos/nuevo`, `/eventos/:id/editar`, `/eventos/:id/encuestadores` | `views/eventos/pages/*` |
| US56, US61 Mis eventos / mis encuestas | Kevin Prieto | `/encuestador/eventos`, `/encuestador/encuestas` | `views/encuestador/pages/MisEventosPage.jsx`, `MisEncuestasPage.jsx` |
| US57 Encuesta ICA | Liz | `/encuestador/eventos/:eventId/ica` | `views/encuestador/pages/EncuestaIcaPage.jsx` |
| US66 Encuesta SPE | Kevin Alanes | `/encuestador/eventos/:eventId/spe` | `views/encuestador/pages/EncuestaSpePage.jsx` |
| US58, US59, US62 Aprobaciones | Monserrat | `/aprobaciones` | `views/aprobaciones-Monserrat/pages/AprobacionesPage.jsx` |
| US51 Listado de convocatorias | Kevin Prieto | `/convocatorias` | `views/convocatorias/pages/ConvocatoriasPage.jsx` |
| US50 Crear convocatoria | Kevin Alanes | `/convocatorias/nueva` | `views/convocatorias/pages/NuevaConvocatoriaPage.jsx` |
| US53 Postulantes | Kevin Alanes | `/convocatorias/:id/postulantes` | `views/convocatorias/pages/PostulantesPage.jsx` |
| US54 Registrar encuestador | Kevin Alanes | `/encuestadores/nuevo` | `views/convocatorias/pages/RegistrarEncuestadorPage.jsx` |
| US52 Postulación pública | Kevin Prieto | `/postular` (público) | `views/convocatorias/pages/PostularPage.jsx` |
| US48 Diccionario de variables | Kevin Alanes | `/diccionario` (público) | `views/diccionario-KevinAlanes/pages/DiccionarioPage.jsx` |
| US49 Cita académica | Santiago | — | a definir (componente para Sobre nosotros y dashboards) |

Los links del nav por rol ya están puestos (`shared/navConfig.js`); el encuestador entra directo a `/encuestador/eventos`.

## Contratos entre piezas

- **Dashboard SPE** (`GET /api/spe`): el controlador de Liz arma `parsearFiltrosSpe(req.query)` (Monserrat) → `obtenerDashboardSpe(filtros)` (Liz) → `calcularInsightsSpe(datos)` (Kevin Alanes). En el frontend, `SPEPage` (Liz) ya renderiza `<FiltrosSpe filtros onAplicar opciones />`, `<InsightsSpe insights />` y `<ExportarSpe filtros />`. Los props y formatos están comentados en cada archivo.
- **Aprobar ICA** (Monserrat) → llama `recalcularAgregadoIca({ communityId, year, quarter })` (Liz).
- **Aprobar SPE** (Monserrat) → llama `calcularIndicesSpe(dataLoadId)` (Liz).
- **Aprobar postulante / registrar encuestador** (Kevin Alanes) → reutilizan `registrarUsuario` de `modules/users/users.service.js` (importar, no copiar ni modificar).

Las funciones de Liz ya existen vacías, así que Monserrat puede llamarlas desde el día uno.

## Flujo del encuestador (ICA y SPE por evento)

1. El Admin/Superadmin crea el evento y marca qué encuestas se toman: `has_ica`, `has_spe` o las dos (Santiago, US44). Solo el Superadmin puede marcar `has_spe`.
2. Le asigna encuestadores (Santiago, US55).
3. El encuestador entra a **Mis eventos** (Kevin Prieto, US56): cada evento muestra "Registrar encuesta ICA" si `has_ica = 1` y "Registrar encuesta SPE" si `has_spe = 1`.
4. El botón lleva a `/encuestador/eventos/:eventId/ica` (Liz, US57) o `/encuestador/eventos/:eventId/spe` (Kevin Alanes, US66). El backend valida que el evento esté asignado al encuestador y que tenga esa encuesta habilitada; si no, responde 400.
5. La encuesta entra **pendiente** (`data_load.status = 1`) y llega a la bandeja de aprobaciones (Monserrat): las ICA al Admin de la sede del encuestador y a todos los Superadmin; las SPE solo a los Superadmin.
6. Al aprobarla pasa a 2 y se recalcula el agregado (Liz). El encuestador ve el estado en **Mis encuestas** (Kevin Prieto, US61).

## Lo que le falta a la BD (para Monserrat, DB master)

El diagrama ya está aplicado en la BD real. Santiago le pasa a Monserrat el script con estos cambios:

1. **`event`**: `has_ica` y `has_spe` (`TINYINT(1) NOT NULL DEFAULT 0`). Un mismo evento puede tener las dos; con las dos en 0 es un evento sin encuesta (charla, taller) y no se le asignan encuestadores.
2. **`data_load`**: `reviewed_by` (FK a `user`), `reviewed_at` y `review_note` (motivo del rechazo) para US59, US61 y US62.
3. **SPE con la encuesta del Word (SOCOMEX–SOCIFIN)**: se elimina `spe_measurement` (era la encuesta vieja del Excel 2025 y estaba vacía) y se crean:
   - `spe_survey_response`: una fila por empresa, con `data_load_id`, `year`, `semester`, `surveyor_user_id`, `event_id`, `status` y las preguntas por sección (`s1_…` a `s8_…`). Sí/No = `ENUM('Sí','No')`; escalas = `TINYINT` 1–5 (lo valida el backend); preguntas de varias opciones = una columna 0/1 por opción.
   - `spe_index_score`: `iee`, `ice`, `iie`, `icie` de cada empresa (los guarda US63 al aprobar).
   - El filtro de US34 ya no es "rubro": es `s1_export_sector`. La ubicación es `s1_department` (no hace falta `campus_id`).

## Pendiente con el cliente (bloquea)

- Tabla de puntajes por pregunta del ICA (US60 y marcar la opción correcta en el explorador).
- Fórmulas de IEE, ICE, IIE e ICIE (US63).
- Encuesta SPE: opciones de inflación y tipo de cambio (el Word no las trae; por ahora usan las del PIB), si "Departamento" lleva solo Santa Cruz, La Paz y Cochabamba, si "Principal barrera" es una sola respuesta y las opciones de "Razón para invertir / no invertir".
