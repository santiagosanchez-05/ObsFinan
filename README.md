# PR3B-observatorio-de-bienestar-financiero-GSILVAS

Bienestar Financiero Univalle — observatorio ICA (Índice de Calidad Aseguradora) y SPE (Sector Privado Exportador).

Frontend: React + Vite + Tailwind v4. Backend: Express + MySQL (MariaDB remota compartida).

## Cómo levantar el proyecto (primera vez)

1. Cloná el repo y entrá a la rama `Dev`.

2. Instalá dependencias (raíz, frontend y backend):

   ```
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   ```

3. Configurá el backend: copiá `backend/.env.example` a `backend/.env` y completá los valores (pedíselos a Santiago por privado — nunca se suben a git).

   ```
   cp backend/.env.example backend/.env
   ```

4. Corré todo junto desde la raíz:

   ```
   npm run dev
   ```

   Esto levanta el backend en `http://localhost:3000` y el frontend en `http://localhost:5173` al mismo tiempo.

5. Para correr los tests (backend + frontend):

   ```
   npm test
   ```

## Estructura del proyecto

- `frontend/src/views/<modulo>/` — una carpeta por módulo (no por rol). Cada módulo tiene sus propias `pages/` y su propio `<modulo>.routes.jsx`. Los módulos de una sola persona llevan su nombre como sufijo (ej. `landing-login-Santiago`).
- `backend/src/modules/<modulo>/` — mismo criterio del lado del backend. Las rutas se montan solas en `/api/<modulo>` (ver `backend/src/config/loadRoutes.js`), así que un módulo nuevo no requiere tocar ningún archivo compartido.
- `frontend/src/shared/` y `backend/src/middlewares/` — lo único común a todos los módulos (auth, nav, layout, `ProtectedRoute`/`RoleGate` en el front; `requireAuth`/`requireRole` en el back).
