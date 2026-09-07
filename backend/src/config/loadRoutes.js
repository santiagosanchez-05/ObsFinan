const fs = require('fs');
const path = require('path');

/**
 * Recorre backend/src/modules/*, y por cada carpeta busca un archivo
 * <carpeta>.routes.js. Si lo encuentra, lo monta automáticamente en
 * /api/<carpeta>.
 *
 * Ejemplo: modules/auth/auth.routes.js  ->  se monta en /api/auth
 *          modules/ica/ica.routes.js    ->  se monta en /api/ica
 *
 * Para agregar un módulo nuevo, alguien solo tiene que crear su carpeta
 * en modules/ con su archivo <nombre>.routes.js — nadie tiene que
 * editar este archivo ni index.js para "conectarlo".
 */
function loadRoutes(app) {
  const modulesPath = path.join(__dirname, '..', 'modules');

  if (!fs.existsSync(modulesPath)) return;

  const moduleFolders = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const folderName of moduleFolders) {
    const routeFile = path.join(modulesPath, folderName, `${folderName}.routes.js`);

    if (fs.existsSync(routeFile)) {
      const router = require(routeFile);
      app.use(`/api/${folderName}`, router);
      console.log(`✔ Módulo cargado: /api/${folderName}`);
    } else {
      console.warn(`⚠ La carpeta "${folderName}" no tiene ${folderName}.routes.js — se ignora`);
    }
  }
}

module.exports = loadRoutes;
