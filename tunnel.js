const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('🔄 Iniciando túnel seguro...');
    
    // Crear túnel al puerto 5173
    const tunnel = await localtunnel({ port: 5173 });

    console.log(`✅ Túnel activo en: ${tunnel.url}`);

    // Leer App.js
    const appJsPath = path.join(__dirname, 'App.js');
    let appJsContent = fs.readFileSync(appJsPath, 'utf8');

    // Reemplazar la URL
    // Busca: const WEB_APP_URL = '...';
    const newContent = appJsContent.replace(
      /const WEB_APP_URL = '.*';/,
      `const WEB_APP_URL = '${tunnel.url}';`
    );

    // Guardar App.js
    fs.writeFileSync(appJsPath, newContent);
    console.log('🚀 App.js actualizado con la nueva URL del túnel.');
    console.log('⚠️  Mantén esta terminal abierta para mantener el túnel activo.');

    tunnel.on('close', () => {
      console.log('❌ Túnel cerrado');
    });

  } catch (err) {
    console.error('❌ Error al iniciar el túnel:', err);
  }
})();
