const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Cargar variables de entorno
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Generar SECRET_KEY si no existe
const SECRET_KEY = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "cdn.tailwindcss.com", "cdn.jsdelivr.net"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "api.groq.com", "api-inference.huggingface.co"]
    }
  }
}));

// Rate limiting más estricto
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: '¡Calma, pisha! Demasiadas peticiones. Espera un poco.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto  
  max: 20, // máximo 20 mensajes por minuto
  message: {
    error: '¡Tranquilo, mostro! Demasiados mensajes muy rápido.'
  }
});

app.use(limiter);
app.use('/api/ai/chat', chatLimiter);

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true 
}));
app.use(cookieParser());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Base de datos con mejores tablas
const sqlite3 = require('sqlite3').verbose();
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutos de cache

const dbPath = process.env.DB_PATH || './carnival_pro.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err);
    process.exit(1);
  } else {
    console.log('✅ Base de datos conectada correctamente');
    initializeTables();
  }
});

function initializeTables() {
  // Tabla de conversaciones con más campos
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      session_id TEXT,
      sentiment TEXT,
      topic TEXT
    )
  `);
  
  // Tabla de usuarios con estadísticas
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_messages INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 1,
      preferred_features TEXT,
      user_agent TEXT
    )
  `);
  
  // Tabla de votos mejorada
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      agrupacion TEXT NOT NULL,
      categoria TEXT NOT NULL,
      puntuacion INTEGER NOT NULL CHECK(puntuacion >= 1 AND puntuacion <= 10),
      comentario TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    )
  `);
  
  // Tabla de análisis poéticos
  db.run(`
    CREATE TABLE IF NOT EXISTS poetry_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      text TEXT NOT NULL,
      analysis_result TEXT,
      verses_count INTEGER,
      syllables_analysis TEXT,
      rhyme_scheme TEXT,
      sentiment TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tabla de configuración del sistema
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Todas las tablas inicializadas correctamente');
}

// Middleware de autenticación mejorado
const authMiddleware = (req, res, next) => {
  const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para tracking de usuarios
const trackUser = (req, res, next) => {
  const { userId } = req.body;
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip;
  
  if (userId) {
    // Actualizar información del usuario
    db.run(`
      INSERT OR REPLACE INTO users (userId, last_active, user_agent, total_messages)
      VALUES (?, CURRENT_TIMESTAMP, ?, 
        COALESCE((SELECT total_messages FROM users WHERE userId = ?), 0) + 1)
    `, [userId, userAgent, userId]);
  }
  
  req.userContext = { userId, userAgent, ipAddress };
  next();
};

// ==================== RUTAS DE API ====================

// Rutas de IA mejoradas
const aiRoutes = require('./routes/ai_enhanced');
app.use('/api/ai', aiRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'carnival_pro_enhanced.html'));
});

// ==================== RUTAS DE ADMIN ====================

app.get('/admin', authMiddleware, async (req, res) => {
  try {
    // Obtener estadísticas
    const stats = await getSystemStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Credenciales desde variables de entorno (más seguro)
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'cadiz2025!';
  
  if (username === adminUser && password === adminPass) {
    const token = jwt.sign(
      { username, role: 'admin' }, 
      SECRET_KEY, 
      { expiresIn: '4h' }
    );
    
    res.cookie('admin_token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 4 * 60 * 60 * 1000 // 4 horas
    });
    
    res.json({ 
      success: true, 
      message: 'Login exitoso',
      expiresIn: '4h'
    });
  } else {
    // Log intento de acceso fallido
    console.warn(`❌ Intento de login fallido: ${username} desde ${req.ip}`);
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

app.post('/admin/logout', authMiddleware, (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logout exitoso' });
});

app.post('/admin/update-config', authMiddleware, async (req, res) => {
  const { groqApiKey, hfApiKey } = req.body;
  
  try {
    // Guardar en base de datos en lugar de archivo
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        if (groqApiKey) {
          db.run(
            'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)',
            ['groq_api_key', groqApiKey]
          );
        }
        if (hfApiKey) {
          db.run(
            'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)',
            ['hf_api_key', hfApiKey]
          );
        }
        resolve();
      });
    });
    
    // Invalidar cache de configuración
    cache.del('api_config');
    
    res.json({ 
      success: true, 
      message: 'Configuración actualizada correctamente' 
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// ==================== RUTAS DE ESTADÍSTICAS ====================

app.get('/api/stats/general', authMiddleware, async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

app.get('/api/stats/users', authMiddleware, (req, res) => {
  db.all(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN last_active > datetime('now', '-24 hours') THEN 1 END) as active_24h,
      COUNT(CASE WHEN last_active > datetime('now', '-7 days') THEN 1 END) as active_7d,
      AVG(total_messages) as avg_messages_per_user
    FROM users
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error obteniendo estadísticas de usuarios' });
    }
    res.json({ success: true, data: rows[0] });
  });
});

// ==================== FUNCIONES AUXILIARES ====================

async function getSystemStats() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let stats = {};
      
      // Total de conversaciones
      db.get('SELECT COUNT(*) as total FROM conversations', (err, row) => {
        if (err) return reject(err);
        stats.totalConversations = row.total;
      });
      
      // Total de usuarios
      db.get('SELECT COUNT(*) as total FROM users', (err, row) => {
        if (err) return reject(err);
        stats.totalUsers = row.total;
      });
      
      // Conversaciones en las últimas 24h
      db.get(`
        SELECT COUNT(*) as total 
        FROM conversations 
        WHERE timestamp > datetime('now', '-24 hours')
      `, (err, row) => {
        if (err) return reject(err);
        stats.conversations24h = row.total;
      });
      
      // Top 5 temas más discutidos
      db.all(`
        SELECT topic, COUNT(*) as count 
        FROM conversations 
        WHERE topic IS NOT NULL 
        GROUP BY topic 
        ORDER BY count DESC 
        LIMIT 5
      `, (err, rows) => {
        if (err) return reject(err);
        stats.topTopics = rows;
        resolve(stats);
      });
    });
  });
}

// Función para obtener configuración de APIs
function getAPIConfig() {
  const cached = cache.get('api_config');
  if (cached) return Promise.resolve(cached);
  
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM system_config WHERE key LIKE "%api_key"', (err, rows) => {
      if (err) return reject(err);
      
      const config = {};
      rows.forEach(row => {
        config[row.key] = row.value;
      });
      
      // Usar variables de entorno como fallback
      if (!config.groq_api_key) config.groq_api_key = process.env.GROQ_API_KEY;
      if (!config.hf_api_key) config.hf_api_key = process.env.HF_API_KEY;
      
      cache.set('api_config', config, 300); // Cache por 5 minutos
      resolve(config);
    });
  });
}

// ==================== MANEJO DE ERRORES ====================

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ==================== INICIALIZACIÓN ====================

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error cerrando base de datos:', err);
    } else {
      console.log('✅ Base de datos cerrada correctamente');
    }
    process.exit(0);
  });
});

// Exportar para testing
module.exports = { app, db, cache, getAPIConfig };

// Iniciar servidor
if (require.main === module) {
  app.listen(port, () => {
    console.log('🎉 ===================================');
    console.log(`🎭 Carnivalito Pro Elite Server`);
    console.log(`📡 Puerto: ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`👑 Admin: http://localhost:${port}/admin`);
    console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log('🎉 ===================================');
  });
}
