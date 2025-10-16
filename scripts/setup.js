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
console.log('   CARNIVALITO PRO ELITE 3.0 - SETUP');
console.log('========================================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    console.log('Configurando Carnivalito Pro Elite...\n');

    // Verificar si .env ya existe
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  El archivo .env ya existe. ¿Sobrescribir? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelado.');
        process.exit(0);
      }
    }

    // Configuración básica
    const port = await question('Puerto del servidor (default: 3000): ') || '3000';
    const env = await question('Entorno (development/production) [development]: ') || 'development';
    
    // Seguridad
    let adminUser = await question('Usuario administrador [admin]: ') || 'admin';
    let adminPass = await question('Contraseña administrador (mínimo 8 caracteres): ');
    
    while (!adminPass || adminPass.length < 8) {
      console.log('❌ La contraseña debe tener al menos 8 caracteres.');
      adminPass = await question('Contraseña administrador: ');
    }
    
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    
    // APIs opcionales
    console.log('\n🤖 APIs Opcionales (puedes configurarlas después):');
    const groqApiKey = await question('Groq API Key (opcional): ');
    const hfApiKey = await question('HuggingFace API Key (opcional): ');
    const googleTTSKey = await question('Google TTS API Key (opcional): ');

    // Crear archivo .env
    const envContent = `# CARNIVALITO PRO ELITE 3.0 - CONFIGURACIÓN
# Generado el: ${new Date().toISOString()}

# Servidor
PORT=${port}
NODE_ENV=${env}
HOST=localhost

# Base de datos
DB_PATH=./data/carnivalito.db
DB_BACKUP_PATH=./backups/

# Seguridad
JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
API_KEY_ROTATION_HOURS=24

# APIs externas (cifradas automáticamente)
GROQ_API_KEY=${groqApiKey}
HUGGINGFACE_API_KEY=${hfApiKey}
GOOGLE_TTS_API_KEY=${googleTTSKey}

# Administrador
ADMIN_USERNAME=${adminUser}
ADMIN_PASSWORD=${adminPass}

# CORS
ALLOWED_ORIGINS=http://localhost:${port},http://127.0.0.1:${port}

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CHAT_RATE_LIMIT=20

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/carnivalito.log

# Cache
CACHE_TTL=300

# Funciones avanzadas
ENABLE_VOICE_SYNTHESIS=true
ENABLE_LEARNING_MODE=true
ENABLE_POETRY_AI=true
ENABLE_REAL_TIME_CHAT=true

# Configuración de voz
VOICE_ENGINE=google
VOICE_LANGUAGE=es-ES
VOICE_SPEED=1.0
VOICE_PITCH=0.0

# Sistema de aprendizaje
LEARNING_THRESHOLD=0.7
AUTO_IMPROVE_RESPONSES=true
COLLECT_FEEDBACK=true

# Backup automático
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n✅ Archivo .env creado');

    // Crear directorios necesarios
    const dirs = ['logs', 'data', 'backups', 'public'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Directorio ${dir}/ creado`);
      }
    });

    // Crear README con instrucciones
    const readmeContent = `# Carnivalito Pro Elite 3.0

## Instalación y configuración completada ✅

### Iniciar el servidor

\`\`\`bash
# Desarrollo
npm run dev

# Producción  
npm start
\`\`\`

### URLs de acceso

- **Chat principal:** http://localhost:${port}
- **Panel de admin:** http://localhost:${port}/admin
- **API Health:** http://localhost:${port}/api/health

### Credenciales de administrador

- **Usuario:** ${adminUser}
- **Contraseña:** ${adminPass}

### Características principales

🧠 **IA Avanzada** - Procesamiento contextual con múltiples modelos
🎤 **Síntesis de Voz** - Google TTS + Web Speech API fallback
📝 **Análisis Poético** - Métricas, rimas y estilo carnavalero
💾 **Sistema de Aprendizaje** - Mejora continua basada en feedback
🔐 **Seguridad Avanzada** - Cifrado de APIs con rotación automática
⚡ **Real-time** - WebSockets para chat en tiempo real

### Configuración de APIs

Para activar todas las funcionalidades, configura las APIs en el panel de admin o editando el archivo .env:

- **Groq:** https://console.groq.com/
- **HuggingFace:** https://huggingface.co/settings/tokens  
- **Google TTS:** https://cloud.google.com/text-to-speech

### Comandos útiles

\`\`\`bash
npm run backup      # Backup manual
npm run health-check # Verificar estado
npm run encrypt-keys # Re-cifrar claves API
\`\`\`

### Estructura del proyecto

\`\`\`
carnivalito-pro-elite/
├── server/
│   ├── index.js                 # Servidor principal
│   ├── database.js              # Gestor de base de datos
│   ├── apiKeyManager.js         # Gestión segura de APIs
│   ├── routes/                  # Rutas de la API
│   └── services/                # Servicios (IA, Voz, Poesía)
├── public/
│   └── index.html               # Frontend principal
├── data/                        # Base de datos SQLite
├── logs/                        # Logs del sistema
├── backups/                     # Backups automáticos
└── package.json
\`\`\`

## ¡Que viva el Carnaval de Cádiz! 🎭⚽
`;

    fs.writeFileSync('README.md', readmeContent);
    console.log('✅ README.md creado');

    console.log('\n🎉 ========================================');
    console.log('     ¡CONFIGURACIÓN COMPLETADA!');
    console.log('========================================');
    console.log(`
📋 Resumen:
   • Puerto: ${port}
   • Entorno: ${env}
   • Admin: ${adminUser}
   • APIs: ${groqApiKey ? 'Groq ✅' : '❌'} ${hfApiKey ? 'HuggingFace ✅' : '❌'} ${googleTTSKey ? 'Google TTS ✅' : '❌'}

🚀 Para iniciar:
   npm install
   npm run dev

🌐 Acceso:
   • Chat: http://localhost:${port}
   • Admin: http://localhost:${port}/admin

⚠️  IMPORTANTE:
   • Guarda las credenciales de admin
   • Las API keys se cifran automáticamente
   • En producción configura HTTPS

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
