// Copia os assets estáticos do Cesium para public/cesium (ignorados pelo git)
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = path.join(__dirname, '..', 'public', 'cesium');

if (!fs.existsSync(src)) {
  console.error('Cesium não encontrado em node_modules — correr "npm install"');
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

for (const dir of ['Assets', 'ThirdParty', 'Widgets', 'Workers']) {
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
// Biblioteca principal: carregada por <script> no CesiumView (não passa pelo webpack)
fs.copyFileSync(path.join(src, 'Cesium.js'), path.join(dest, 'Cesium.js'));
const sizeMB = (fs.statSync(path.join(dest, 'Cesium.js')).size / 1024 / 1024).toFixed(1);
console.log(`Assets do Cesium copiados para public/cesium (Cesium.js ${sizeMB} MB)`);
