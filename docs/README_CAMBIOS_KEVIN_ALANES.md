# Cambios — Kevin Alanes (Sprint 2)

Este documento detalla TODO lo que hice en el Sprint 2: archivos creados,
archivos modificados, qué falta, y notas importantes.

**Fecha:** 02/10/2026
**Rama:** `Kevin_Alanes`

---

## ✅ Resumen de tareas

| US       | Tarea                           | Backend  | Frontend | Estado           |
| -------- | ------------------------------- | -------- | -------- | ---------------- |
| **US36** | Insights SPE                    | ✅ Hecho | ✅ Hecho | ✅ **Completa**  |
| **US48** | Diccionario de variables        | N/A      | ✅ Hecho | ✅ **Completa**  |
| **US50** | Crear convocatoria              | ✅ Hecho | ❌ Falta | 🟡 **Parcial**   |
| **US54** | Registro directo de encuestador | ✅ Hecho | ❌ Falta | 🟡 **Parcial**   |
| **US53** | Gestionar postulantes           | ❌ Falta | ❌ Falta | 🔴 **Pendiente** |
| **US66** | Encuesta SPE del encuestador    | ❌ Falta | ❌ Falta | 🔴 **Pendiente** |

---

## 📂 Archivos CREADOS

### Backend

| Archivo                                                                 | ¿Para qué?                                  | US   |
| ----------------------------------------------------------------------- | ------------------------------------------- | ---- |
| `backend/src/modules/convocatorias/convocatorias.gestion.validation.js` | Esquema Zod para validar convocatorias      | US50 |
| `backend/src/modules/convocatorias/convocatorias.gestion.service.js`    | Lógica de negocio: crear convocatoria en BD | US50 |
| `backend/src/modules/users/users.encuestadores.validation.js`           | Esquema Zod para validar encuestadores      | US54 |

### Frontend

| Archivo                                                                | ¿Para qué?                                                        | US   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| `frontend/src/views/diccionario-KevinAlanes/pages/DiccionarioPage.jsx` | Página pública del diccionario con 3 tabs (ICA, SPE, Índices SPE) | US48 |

### Documentación

| Archivo                          | ¿Para qué?   |
| -------------------------------- | ------------ |
| `README_CAMBIOS_KEVIN_ALANES.md` | Este archivo |

---

## 📝 Archivos MODIFICADOS

### Backend

| Archivo                                                                 | ¿Qué cambió?                                                      | US   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| `backend/src/modules/convocatorias/convocatorias.gestion.controller.js` | Reemplacé `pendiente('US50')` por `postConvocatoria` real         | US50 |
| `backend/src/modules/users/users.encuestadores.controller.js`           | Reemplacé `pendiente('US54')` por `postRegistrarEncuestador` real | US54 |
| `backend/src/modules/spe/spe.insights.service.js`                       | Implementé `calcularInsightsSpe(datos)` con 6 tipos de insights   | US36 |

### Frontend

| Archivo                                                                | ¿Qué cambió?                                                             | US   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| `frontend/src/views/spe/components/InsightsSpe.jsx`                    | Reemplacé `BloquePendiente` por el componente visual de insights         | US36 |
| `frontend/src/views/spe/pages/SPEPage.jsx`                             | Agregué **MOCK TEMPORAL** de datos (revertir cuando Liz implemente US35) | US36 |
| `frontend/src/views/diccionario-KevinAlanes/pages/DiccionarioPage.jsx` | Reemplacé `PlaceholderPage` por el diccionario completo                  | US48 |

---

## ⚠️ NOTAS IMPORTANTES

### 1. MOCK temporal en `SPEPage.jsx`

En `frontend/src/views/spe/pages/SPEPage.jsx` dejé un **mock temporal** de datos:

```jsx
// ⚠️ MOCK TEMPORAL — Revertir cuando Liz implemente US35 (obtenerDashboardSpe)
const datos = {
  insights: [ /* datos de ejemplo */ ],
};
¿Por qué? Para mostrar el diseño de los insights mientras Liz no implementa su parte.

¿Cuándo revertirlo? Cuando Liz termine la US35 (obtenerDashboardSpe), se reemplaza por el fetch real a GET /api/spe.

2. Endpoints NUEVOS que funcionan
Endpoint	Método	¿Qué hace?	US
/api/convocatorias	POST	Crear una convocatoria	US50
/api/users/encuestadores	POST	Registrar un encuestador directo	US54
Ambos endpoints ya fueron probados con PowerShell y funcionan. ✅

3. Usuarios de prueba en la BD
Creé dos usuarios de prueba para avanzar con mis tareas (los eliminaré al terminar):

Correo	Rol	Contraseña
kevin.superadmin@test.com	Superadmin	KevinPassSA
kevin.encuestador@test.com	Encuestador	KevinPassE
4. Datos reales vs mock
Componente	¿Usa datos reales?
Diccionario (US48)	✅ Datos estáticos (nombres reales de la BD)
Insights SPE (US36)	⚠️ Mock temporal (hasta que Liz implemente US35)
Backend US50	✅ Datos reales (prueba exitosa)
Backend US54	✅ Datos reales (prueba exitosa)
🔴 LO QUE FALTA
Frontend de US50
Archivo: frontend/src/views/convocatorias/pages/NuevaConvocatoriaPage.jsx

¿Qué hacer? Reemplazar el placeholder por un formulario con:

Título

Fecha de inicio / fin

Descripción

Sede (solo Superadmin puede elegir)

Botón "Crear convocatoria"

Endpoint: POST /api/convocatorias (ya funciona)

Frontend de US54
Archivo: frontend/src/views/convocatorias/pages/RegistrarEncuestadorPage.jsx

¿Qué hacer? Reemplazar el placeholder por un formulario con:

Nombre, apellido paterno, apellido materno

Correo

Sede (Admin: fija; Superadmin: puede elegir)

Botón "Registrar"

Endpoint: POST /api/users/encuestadores (ya funciona)

US53 — Gestionar postulantes
Backend: convocatorias.gestion.controller.js → getPostulantes y patchPostulante
Frontend: PostulantesPage.jsx

Depende de: US50 (necesitas convocatorias creadas).

US66 — Encuesta SPE del encuestador
Backend: spe.encuestador.controller.js → POST /api/spe/encuestas
Frontend: encuestador/pages/EncuestaSpePage.jsx

Depende de: Liz (US37) — mismo formulario.

📌 Cómo probar lo que hice
US50 (Crear convocatoria)
bash
# Login como Superadmin
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"kevin.superadmin@test.com","password":"KevinPassSA"}'

$token = $login.token

# Crear convocatoria
$body = @{
  campus_id = 1
  title = "Convocatoria de prueba"
  start_date = "2026-10-01"
  end_date = "2026-10-31"
  description = "Prueba"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/convocatorias" `
  -Method POST -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" -Body $body
US54 (Registrar encuestador)
bash
# Registrar encuestador
$body = @{
  nombre = "Juan"
  apellidoPaterno = "Pérez"
  apellidoMaterno = "Gómez"
  correo = "juan.perez@test.com"
  campusId = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users/encuestadores" `
  -Method POST -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" -Body $body
US36 (Insights SPE)
Ve a http://localhost:5173/spe → Deberías ver los 6 insights.

US48 (Diccionario)
Ve a http://localhost:5173/diccionario → Deberías ver los 3 tabs.

📋 Checklist de verificación
☑ US36 — Backend + Frontend (con mock temporal)
☑ US48 — Frontend (datos reales)
☑ US50 — Backend (probado con PowerShell)
☑ US54 — Backend (probado con PowerShell)
□ US50 — Frontend (pendiente)
□ US54 — Frontend (pendiente)
□ US53 — Backend + Frontend (pendiente)
□ US66 — Backend + Frontend (pendiente)
```
