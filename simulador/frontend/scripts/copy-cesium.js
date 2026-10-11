// Copia os assets estáticos do Cesium para public/cesium (ignorados pelo git)
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = path.join(__dirname, '..', 'public', 'cesium');

for (const dir of ['Assets', 'ThirdParty', 'Widgets', 'Workers']) {
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
// Biblioteca já compilada e minificada: carregada por <script> no CesiumView (não passa pelo webpack)
fs.copyFileSync(path.join(src, 'Cesium.js'), path.join(dest, 'Cesium.js'));
console.log('Assets do Cesium copiados para public/cesium');
