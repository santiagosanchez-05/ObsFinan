// Kevin Prieto — US40 (descarga CSV/JSON), US41 (detalle de archivo), US42 (baja).
// Crea tu spe.archivos.service.js al implementar. La descarga es pública y
// solo incluye cargas APROBADAS.
const pendiente = require('../../utils/pendiente');

module.exports = {
  getExportSpe: pendiente('US40', 'Kevin Prieto'),
  getDetalleArchivoSpe: pendiente('US41', 'Kevin Prieto'),
  deleteArchivoSpe: pendiente('US42', 'Kevin Prieto'),
  deleteRegistroSpe: pendiente('US42', 'Kevin Prieto'),
};
