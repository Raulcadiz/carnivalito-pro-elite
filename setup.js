#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎭 ========================================');
console.log('   CARNIVALITO PRO ELITE - SETUP');
console.log('========================================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    console.log('Configurando tu instalación de Carnivalito Pro Elite...\n');

    // Verificar si .env ya existe
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  El archivo .env ya existe. ¿Sobrescribir? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelado.');
        process.exit(0);
      }
    }

    // Recopilar información
    console.log('📝 Configuración básica:\n');
    
    const port = await question('Puerto del servidor (default: 3000): ') || '3000';
    
    const env = await question('Entorno (development/production) [development]: ') || 'development';
    
    console.log('\n🔐 Configuración de seguridad:\n');
    
    let adminUser = await question('Usuario administrador [admin]: ') || 'admin';
    let adminPass = await question('Contraseña administrador (mínimo 8 caracteres): ');
    
    while (!adminPass || adminPass.length < 8) {
      console.log('❌ La contraseña debe tener al menos 8 caracteres.');
      adminPass = await question('Contraseña administrador: ');
    }
    
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    console.log('✅ JWT Secret generado automáticamente');
    
    console.log('\n🤖 Configuración de APIs:\n');
    console.log('Para obtener las API keys:');
    console.log('• Groq: https://console.groq.com/');
    console.log('• HuggingFace: https://huggingface.co/settings/tokens\n');
    
    const groqApiKey = await question('Groq API Key (opcional): ');
    const hfApiKey = await question('HuggingFace API Key (opcional): ');
    
    if (!groqApiKey && !hfApiKey) {
      console.log('⚠️  Sin APIs configuradas. El sistema usará respuestas locales únicamente.');
    }

    console.log('\n📊 Configuración avanzada:\n');
    
    const enableBackup = await question('¿Habilitar backup automático? (Y/n): ');
    const backupEnabled = enableBackup.toLowerCase() !== 'n' && enableBackup.toLowerCase() !== 'no';
    
    const logLevel = await question('Nivel de logging (info/debug/warn/error) [info]: ') || 'info';

    // Crear archivo .env
    const envContent = `# ===================================
# CARNIVALITO PRO ELITE - CONFIGURACIÓN
# Generado el: ${new Date().toISOString()}
# ===================================

# Configuración del servidor
PORT=${port}
NODE_ENV=${env}

# URLs permitidas para CORS
ALLOWED_ORIGINS=http://localhost:${port},http://127.0.0.1:${port}

# Base de datos
DB_PATH=./carnival_pro_elite.db

# APIs externas
GROQ_API_KEY=${groqApiKey}
HF_API_KEY=${hfApiKey}

# Seguridad
JWT_SECRET=${jwtSecret}
ADMIN_USERNAME=${adminUser}
ADMIN_PASSWORD=${adminPass}

# Logging
LOG_LEVEL=${logLevel}
LOG_FILE=./logs/carnivalito.log

# Cache
CACHE_TTL=300

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CHAT_RATE_LIMIT_WINDOW=60000
CHAT_RATE_LIMIT_MAX=20

# Backup
BACKUP_ENABLED=${backupEnabled}
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30

# ===================================
# ¡CONFIGURACIÓN COMPLETADA!
# Para cambiar estos valores, edita este archivo
# ===================================
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n✅ Archivo .env creado correctamente');

    // Crear directorios necesarios
    const dirs = ['logs', 'backups', 'public'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Directorio ${dir}/ creado`);
      }
    });

    // Mover archivos a sus ubicaciones correctas
    if (fs.existsSync('carnival_pro_enhanced.html')) {
      fs.renameSync('carnival_pro_enhanced.html', 'public/index.html');
      console.log('✅ Frontend movido a public/index.html');
    }

    if (fs.existsSync('app_enhanced.js')) {
      fs.renameSync('app_enhanced.js', 'app.js');
      console.log('✅ Servidor principal renombrado a app.js');
    }

    // Crear script de inicio rápido
    const startScript = `#!/bin/bash
echo "🎭 Iniciando Carnivalito Pro Elite..."
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado. Ejecuta 'npm run setup' primero."
    exit 1
fi

if [ "$NODE_ENV" = "production" ]; then
    echo "🚀 Modo producción"
    npm start
else
    echo "🔧 Modo desarrollo"
    npm run dev
fi
`;

    fs.writeFileSync('start.sh', startScript);
    fs.chmodSync('start.sh', '755');
    console.log('✅ Script de inicio creado (start.sh)');

    console.log('\n🎉 ========================================');
    console.log('     ¡CONFIGURACIÓN COMPLETADA!');
    console.log('========================================');
    console.log(`
📋 Resumen de la configuración:
   • Puerto: ${port}
   • Entorno: ${env}
   • Admin: ${adminUser}
   • APIs configuradas: ${groqApiKey ? 'Groq ✅' : 'Groq ❌'} ${hfApiKey ? 'HuggingFace ✅' : 'HuggingFace ❌'}
   • Backup automático: ${backupEnabled ? 'Habilitado ✅' : 'Deshabilitado ❌'}

🚀 Para iniciar el servidor:
   npm start           # Producción
   npm run dev         # Desarrollo
   ./start.sh          # Script automático

🌐 URLs de acceso:
   • Chat: http://localhost:${port}
   • Admin: http://localhost:${port}/admin

📚 Comandos útiles:
   npm run backup      # Hacer backup manual
   npm run migrate     # Migrar base de datos
   npm test           # Ejecutar tests

⚠️  IMPORTANTE:
   • Guarda tu contraseña de admin: ${adminPass}
   • Las API keys son opcionales pero recomendadas
   • En producción, configura HTTPS y firewall

¡Que viva el Carnaval de Cádiz! 🎭⚽
`);

  } catch (error) {
    console.error('❌ Error durante el setup:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup();
