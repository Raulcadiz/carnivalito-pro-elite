#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createDistribution() {
  console.log('📦 Creando distribución de Carnivalito Pro Elite 3.0...\n');

  // Crear directorio de distribución
  const distDir = './dist';
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Crear archivo ZIP
  const output = fs.createWriteStream(path.join(distDir, 'carnivalito-pro-elite-v3.0.zip'));
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✅ Distribución creada: ${archive.pointer()} bytes`);
      console.log('📁 Archivo: ./dist/carnivalito-pro-elite-v3.0.zip\n');
      
      console.log('🎉 ========================================');
      console.log('   CARNIVALITO PRO ELITE 3.0 LISTO');
      console.log('========================================');
      console.log(`
📋 Contenido del paquete:
   • Servidor Node.js completo
   • Frontend moderno y responsivo
   • Sistema de IA con múltiples modelos
   • Síntesis de voz avanzada
   • Análisis poético carnavalero
   • Sistema de aprendizaje adaptativo
   • Panel de administración
   • Base de datos SQLite
   • Cifrado de APIs con rotación
   • WebSockets para tiempo real

🚀 Instalación:
   1. Extraer el ZIP
   2. cd carnivalito-pro-elite
   3. npm install
   4. npm run setup
   5. npm run dev

🌐 Acceso:
   • Chat: http://localhost:3000
   • Admin: http://localhost:3000/admin

🎭 ¡Que viva el Carnaval de Cádiz!
      `);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    // Añadir archivos al ZIP
    archive.file('package.json', { name: 'carnivalito-pro-elite/package.json' });
    archive.file('.env.example', { name: 'carnivalito-pro-elite/.env.example' });
    archive.directory('server/', 'carnivalito-pro-elite/server/');
    archive.directory('public/', 'carnivalito-pro-elite/public/');
    archive.directory('scripts/', 'carnivalito-pro-elite/scripts/');
    
    // Crear directorios vacíos necesarios
    archive.append('', { name: 'carnivalito-pro-elite/data/.gitkeep' });
    archive.append('', { name: 'carnivalito-pro-elite/logs/.gitkeep' });
    archive.append('', { name: 'carnivalito-pro-elite/backups/.gitkeep' });
    
    archive.finalize();
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createDistribution().catch(console.error);
}

module.exports = createDistribution;
