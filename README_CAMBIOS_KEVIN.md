# README - Cambios realizados por Kevin Alanes

## Proyecto

**PR3B - Observatorio de Bienestar Financiero**

**Rama:** `Kevin_Alanes`

Este documento resume las implementaciones, modificaciones y archivos creados durante el desarrollo de las historias trabajadas en esta rama.

---

# 1. US15 - Dashboard de Sedes

## Frontend - Dashboard de Sedes

**Ruta exacta:**

```text
frontend/src/views/sedes/pages/SedesPage.jsx
```

**Acción:** Reemplazado completamente

### Cambios realizados

Se eliminó el `PlaceholderPage` que tenía anteriormente la vista y se implementó el dashboard completo de Sedes.

La página ahora cuenta con:

- KPIs de información de las sedes.
- Gráficos utilizando `recharts`.
- Filtros de sedes.
- Vista general de todas las sedes.
- Vista específica de una sede.
- Tablas con información de las sedes.
- Lógica para cambiar entre la vista general y la vista individual.
- Consumo de información real proveniente del backend.
- Sedes cargadas dinámicamente desde la base de datos.

### Sedes dinámicas

No se dejaron las sedes hardcodeadas en el frontend.

El frontend obtiene las sedes disponibles desde el backend, por lo que si posteriormente se agregan nuevas sedes a la base de datos, estas podrán aparecer automáticamente en el dashboard sin tener que modificar manualmente `SedesPage.jsx`.

### Header duplicado

También se eliminó el header duplicado que existía dentro de `SedesPage.jsx`.

Anteriormente la página tenía un componente:

```jsx
<Nav />
```

que provocaba que apareciera un segundo header.

Se eliminó este componente porque el proyecto ya cuenta con un header global mediante:

```text
frontend/src/shared/Layout.jsx
```

y:

```text
frontend/src/shared/Navbar.jsx
```

De esta manera, Sedes utiliza el header global del proyecto y se evita duplicar la navegación.

---

# 2. US15 - Backend del Dashboard de Sedes

## Controller

**Ruta exacta:**

```text
backend/src/modules/sedes/sedes.controller.js
```

**Acción:** Archivo creado

### Función

Contiene los controladores utilizados para atender las solicitudes relacionadas con las estadísticas del dashboard de Sedes.

Se implementó el endpoint utilizado por el frontend para obtener la información estadística.

---

## Routes

**Ruta exacta:**

```text
backend/src/modules/sedes/sedes.routes.js
```

**Acción:** Archivo creado

### Función

Define las rutas HTTP correspondientes al módulo de Sedes.

La ruta principal utilizada para las estadísticas es:

```text
GET /api/sedes/stats
```

El acceso está protegido para usuarios con permisos de `superadmin`.

---

## Service

**Ruta exacta:**

```text
backend/src/modules/sedes/sedes.service.js
```

**Acción:** Archivo creado

### Función

Contiene la lógica para consultar la información de las sedes en la base de datos y generar las estadísticas utilizadas por el dashboard.

La información se obtiene dinámicamente de la base de datos.

---

# 3. Frontend - Dependencias

## package.json

**Ruta exacta:**

```text
frontend/package.json
```

**Acción:** Actualizado

## package-lock.json

**Ruta exacta:**

```text
frontend/package-lock.json
```

**Acción:** Actualizado

### Dependencias instaladas

Se agregaron:

```text
recharts
lucide-react
```

### Recharts

Se utiliza para la implementación de los gráficos del Dashboard de Sedes.

### Lucide React

Se utiliza para los íconos utilizados en las interfaces implementadas.

### Comando utilizado

```bash
npm install --prefix frontend recharts lucide-react
```

Resultado de la instalación:

```text
changed 1 package, and audited 181 packages in 29s

36 packages are looking for funding
run `npm fund` for details

found 0 vulnerabilities
```

La instalación finalizó correctamente y no se detectaron vulnerabilidades.

---

# 4. Backend - .gitignore

**Ruta exacta:**

```text
backend/.gitignore
```

**Acción:** Modificado

### Cambio realizado

Se agregó:

```text
uploads
```

### Motivo

Esta modificación fue tomada de la versión actualizada del `.gitignore` que tenía Monserrat en su rama.

La finalidad es evitar que la carpeta de archivos subidos por los usuarios sea incluida en Git.

Esta carpeta puede contener archivos cargados por los usuarios, por ejemplo:

- Archivos Excel utilizados para ICA.
- Archivos Excel utilizados para SPE.
- Otros archivos subidos durante el funcionamiento del sistema.

Por lo tanto, `uploads` debe mantenerse fuera del control de versiones.

---

# 5. US25 - Página 404

## Frontend - Página 404

**Ruta exacta:**

```text
frontend/src/views/not-found-KevinAlanes/pages/NotFoundPage.jsx
```

**Acción:** Modificado

### Cambios realizados

Se implementó el diseño de la página 404 para las rutas inexistentes.

La página muestra:

- Código `404`.
- Mensaje `Página no encontrada`.
- Descripción indicando que la página solicitada no existe o ya no está disponible.
- Botón `Volver al inicio`.

El botón permite regresar a:

```text
/
```

### Router

No fue necesario modificar la ruta comodín porque ya estaba configurada correctamente.

**Ruta exacta:**

```text
frontend/src/views/not-found-KevinAlanes/notFoundRoutes.jsx
```

La ruta existente:

"```jsx
const notFoundRoutes = [
{
path: '*',
element: <NotFoundPage />,
},
];

````"

continúa siendo utilizada para capturar las rutas inexistentes.

---

# 6. US26 - Sesión expirada por inactividad

## Frontend - AuthContext

**Ruta exacta:**

```text
frontend/src/shared/AuthContext.jsx
````

**Acción:** Modificado

### Función

Se implementó el control de sesión por inactividad.

Actualmente el tiempo configurado para la sesión por inactividad es:

```js
const INACTIVITY_LIMIT = 20 * 60 * 1000;
```

Esto corresponde a:

```text
20 minutos
```

### Actividad detectada

Se consideran diferentes acciones del usuario como actividad:

- Click.
- Movimiento del mouse.
- Teclado.
- Scroll.
- Touch.
- Pointer events.

Cuando el usuario realiza alguna de estas acciones, se actualiza el tiempo de última actividad.

Si el usuario permanece sin actividad durante 20 minutos, la sesión se considera expirada.

---

# 7. US26 - Modal de sesión expirada

**Ruta exacta:**

```text
frontend/src/shared/SessionExpiredModal.jsx
```

**Acción:** Archivo creado

### Función

Se creó un componente específico para mostrar el aviso cuando la sesión expira por inactividad.

El mensaje mostrado es:

```text
Su sesión expiró
```

También se muestra:

```text
Será redirigido al inicio de sesión.
```

El modal incluye una animación de aproximadamente 2 segundos.

Después de ese tiempo:

1. Se cierra la sesión.
2. Se redirige al usuario a:

```text
/login
```

---

# 8. US26 - Helper para peticiones autenticadas

**Ruta exacta:**

```text
frontend/src/shared/apiFetch.js
```

**Acción:** Archivo creado

### Función

Se creó un helper para manejar las peticiones al backend y detectar respuestas:

```text
401 Unauthorized
```

Esto permite manejar correctamente situaciones en las que el token JWT ya no sea válido o haya expirado.

El helper genera el evento correspondiente para que el sistema pueda informar al usuario que su sesión expiró.

---

# 9. US26 - Layout global

**Ruta exacta:**

```text
frontend/src/shared/Layout.jsx
```

**Acción:** Modificado

### Cambios realizados

Se integró el componente:

```text
SessionExpiredModal.jsx
```

al layout global de la aplicación.

Esto permite que el aviso de sesión expirada pueda aparecer independientemente de la página protegida en la que se encuentre el usuario.

La estructura mantiene:

```text
Navbar
Contenido de la página
Modal de sesión expirada
```

---

# 10. Sincronización de sesión entre pestañas

Como parte de US26 se implementó sincronización mediante `localStorage`.

Esto permite detectar cambios de sesión realizados desde otras pestañas o ventanas del navegador.

El objetivo es evitar situaciones como:

```text
Pestaña 1 → sesión expirada
Pestaña 2 → continúa mostrando la sesión como activa
```

Las pestañas pueden detectar los cambios relacionados con:

```text
bfu_auth
bfu_session_event
bfu_last_activity
```

De esta manera, el estado de sesión puede mantenerse sincronizado entre las diferentes pestañas abiertas.

---

# 11. Duración máxima del JWT

La duración máxima del token JWT continúa configurada en el backend.

**Archivo:**

```text
backend/src/modules/auth/auth.service.js
```

Configuración actual:

```js
const TOKEN_EXPIRA_EN = "8h";
```

Esto significa que el JWT tiene una duración máxima de 8 horas.

Esto es independiente del control de inactividad.

Actualmente existen dos controles:

```text
Inactividad
20 minutos
↓
Cierre automático de sesión
```

y:

```text
JWT
8 horas
↓
Expiración máxima del token
```

---

# 12. Otros tiempos de autenticación

Los siguientes tiempos existentes en `auth.service.js` corresponden a procesos diferentes y no fueron modificados:

### Código de recuperación

```js
const CODIGO_VALIDO_POR_MINUTOS = 15;
```

Corresponde al código enviado para recuperación de contraseña.

### Token de restablecimiento

```js
const RESET_TOKEN_EXPIRA_EN = "10m";
```

Corresponde al token utilizado para restablecer la contraseña.

Estos valores **no corresponden a la duración de la sesión normal del usuario**.

---

# 13. Archivos creados

Durante el desarrollo se crearon los siguientes archivos:

```text
backend/src/modules/sedes/sedes.controller.js
backend/src/modules/sedes/sedes.routes.js
backend/src/modules/sedes/sedes.service.js

frontend/src/shared/SessionExpiredModal.jsx
frontend/src/shared/apiFetch.js
```

---

# 14. Archivos modificados

Los archivos modificados son:

```text
backend/.gitignore

frontend/package.json
frontend/package-lock.json

frontend/src/shared/AuthContext.jsx
frontend/src/shared/Layout.jsx

frontend/src/views/not-found-KevinAlanes/pages/NotFoundPage.jsx
frontend/src/views/sedes/pages/SedesPage.jsx
```

---

# 15. Archivos relacionados que NO fueron modificados

Estos archivos están relacionados con las funcionalidades implementadas, pero ya se encontraban configurados correctamente y no fue necesario modificarlos.

## Rutas de Sedes

**Ruta exacta:**

```text
frontend/src/views/sedes/sedes.routes.jsx
```

### Motivo

La ruta de Sedes ya estaba creada y configurada correctamente.

No fue necesario modificarla.

---

## Router principal

**Ruta exacta:**

```text
frontend/src/app/router.jsx
```

### Motivo

La ruta de Sedes ya estaba registrada.

Tampoco fue necesario modificar el router para la implementación del dashboard.

---

## Configuración de navegación

**Ruta exacta:**

```text
frontend/src/shared/navConfig.js
```

### Motivo

El enlace de Sedes ya estaba configurado en la navegación para el rol correspondiente.

No fue necesario agregarlo nuevamente.

---

# 16. Resumen general

| Área                  | Ruta                                                              | Acción                    |
| --------------------- | ----------------------------------------------------------------- | ------------------------- |
| Dashboard Sedes       | `frontend/src/views/sedes/pages/SedesPage.jsx`                    | Reemplazado completamente |
| Dependencias          | `frontend/package.json`                                           | Actualizado               |
| Dependencias          | `frontend/package-lock.json`                                      | Actualizado               |
| Backend Sedes         | `backend/src/modules/sedes/sedes.controller.js`                   | Creado                    |
| Backend Sedes         | `backend/src/modules/sedes/sedes.routes.js`                       | Creado                    |
| Backend Sedes         | `backend/src/modules/sedes/sedes.service.js`                      | Creado                    |
| Backend configuración | `backend/.gitignore`                                              | Modificado                |
| Página 404            | `frontend/src/views/not-found-KevinAlanes/pages/NotFoundPage.jsx` | Modificado                |
| Sesión                | `frontend/src/shared/AuthContext.jsx`                             | Modificado                |
| Sesión                | `frontend/src/shared/Layout.jsx`                                  | Modificado                |
| Sesión                | `frontend/src/shared/SessionExpiredModal.jsx`                     | Creado                    |
| Sesión                | `frontend/src/shared/apiFetch.js`                                 | Creado                    |

---

# 17. Archivos relacionados que no se modificaron

| Ruta                                        | Motivo                                       |
| ------------------------------------------- | -------------------------------------------- |
| `frontend/src/views/sedes/sedes.routes.jsx` | Ya estaba creado y configurado correctamente |
| `frontend/src/app/router.jsx`               | La ruta de Sedes ya estaba registrada        |
| `frontend/src/shared/navConfig.js`          | El enlace a Sedes ya estaba configurado      |

---

# 18. Pruebas realizadas

### Dashboard de Sedes

Se verificó:

- Carga de información.
- Visualización de KPIs.
- Visualización de gráficos.
- Cambio entre "Todas" y una sede específica.
- Carga dinámica de sedes.
- Uso del header global.
- Eliminación del header duplicado.

### Página 404

Se verificó accediendo manualmente a una ruta inexistente.

La aplicación muestra la página 404 y permite regresar al inicio.

### Sesión por inactividad

Se realizaron pruebas utilizando inicialmente tiempos menores para comprobar el funcionamiento sin tener que esperar los 20 minutos completos.

Se verificó el cierre automático de sesión y la redirección al login.

---

# 19. Nota para el equipo

Los archivos ubicados dentro de:

```text
frontend/src/shared/
```

son archivos compartidos por diferentes funcionalidades del frontend.

En particular:

```text
frontend/src/shared/AuthContext.jsx
frontend/src/shared/Layout.jsx
frontend/src/shared/apiFetch.js
frontend/src/shared/SessionExpiredModal.jsx
```

deben modificarse con cuidado, ya que pueden afectar a varias páginas del sistema.

Cualquier modificación futura sobre estos archivos debería comunicarse al equipo y probarse con las funcionalidades que utilizan autenticación.

---

# 20. Estado de las historias

### US15 - Dashboard de Sedes

Implementado.

### US25 - Página 404

Implementado.

### US26 - Sesión expirada por inactividad

Implementado y probado con tiempo reducido.

### Configuración de dependencias

`recharts` instalado.

`lucide-react` instalado.

### Configuración de archivos ignorados

`uploads` agregado a `backend/.gitignore`.
