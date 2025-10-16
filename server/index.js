const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');

require('dotenv').config();

const APIKeyManager = require('./apiKeyManager');
const DatabaseManager = require('./database');
const AIService = require('./services/aiService');
const VoiceService = require('./services/voiceService');
const PoetryService = require('./services/poetryService');
const LearningService = require('./services/learningService');

class CarnivalitoServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3000;
    this.apiKeyManager = new APIKeyManager();
    this.dbManager = new DatabaseManager();
    
    this.initializeLogger();
    this.initializeMiddleware();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeScheduledTasks();
  }

  initializeLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'carnivalito-pro' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.tailwindcss.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "cdn.jsdelivr.net"],
          fontSrc: ["'self'", "fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          mediaSrc: ["'self'", "blob:"]
        }
      }
    }));

    // Compression
    this.app.use(compression());

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: {
        error: 'Demasiadas peticiones, pisha. Espera un poquito.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    const chatLimiter = rateLimit({
      windowMs: 60000, // 1 minuto
      max: parseInt(process.env.CHAT_RATE_LIMIT) || 20,
      message: {
        error: 'Tranquilo, mostro. Demasiados mensajes muy rápido.'
      }
    });

    this.app.use(limiter);
    this.app.use('/api/chat', chatLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  async initializeServices() {
    try {
      await this.dbManager.initialize();
      
      this.aiService = new AIService(this.apiKeyManager, this.logger);
      this.voiceService = new VoiceService(this.apiKeyManager, this.logger);
      this.poetryService = new PoetryService(this.logger);
      this.learningService = new LearningService(this.dbManager, this.logger);

      this.logger.info('Todos los servicios inicializados correctamente');
    } catch (error) {
      this.logger.error('Error inicializando servicios:', error);
      throw error;
    }
  }

  initializeRoutes() {
    // API Routes
    this.app.use('/api/chat', require('./routes/chat')(
      this.aiService, 
      this.learningService, 
      this.dbManager
    ));
    
    this.app.use('/api/voice', require('./routes/voice')(this.voiceService));
    this.app.use('/api/poetry', require('./routes/poetry')(this.poetryService));
    this.app.use('/api/admin', require('./routes/admin')(
      this.dbManager, 
      this.apiKeyManager,
      this.learningService
    ));

    // Health check
    this.app.get('/api/health', (req, res) => {
      const keyIntegrity = this.apiKeyManager.validateKeyIntegrity();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        services: {
          database: this.dbManager.isConnected(),
          apiKeys: keyIntegrity.valid > 0,
          voice: this.voiceService.isAvailable(),
          poetry: true,
          learning: this.learningService.isActive()
        },
        stats: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          apiKeysValid: keyIntegrity.valid,
          apiKeysTotal: keyIntegrity.total
        }
      });
    });

    // Main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Ruta no encontrada, pisha',
        path: req.originalUrl
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      this.logger.error('Error no manejado:', err);
      res.status(500).json({
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      });
    });
  }

  initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info('Cliente conectado:', socket.id);

      socket.on('join_room', (room) => {
        socket.join(room);
        this.logger.info(`Cliente ${socket.id} se unió a la sala ${room}`);
      });

      socket.on('chat_message', async (data) => {
        try {
          const response = await this.aiService.processMessage(
            data.message, 
            data.userId, 
            data.context
          );
          
          socket.emit('chat_response', {
            response,
            timestamp: new Date().toISOString(),
            messageId: data.messageId
          });

          // Aprendizaje en tiempo real
          if (process.env.ENABLE_LEARNING_MODE === 'true') {
            this.learningService.analyzeInteraction(data.message, response);
          }

        } catch (error) {
          this.logger.error('Error procesando mensaje del socket:', error);
          socket.emit('chat_error', {
            error: 'Error procesando mensaje',
            messageId: data.messageId
          });
        }
      });

      socket.on('voice_synthesis', async (data) => {
        try {
          const audioBuffer = await this.voiceService.synthesizeText(
            data.text,
            data.options
          );
          
          socket.emit('voice_ready', {
            audio: audioBuffer.toString('base64'),
            messageId: data.messageId
          });
        } catch (error) {
          this.logger.error('Error en síntesis de voz:', error);
          socket.emit('voice_error', {
            error: 'Error generando audio',
            messageId: data.messageId
          });
        }
      });

      socket.on('disconnect', () => {
        this.logger.info('Cliente desconectado:', socket.id);
      });
    });
  }

  initializeScheduledTasks() {
    // Backup automático diario
    cron.schedule('0 2 * * *', () => {
      this.logger.info('Iniciando backup automático...');
      this.dbManager.createBackup()
        .then(backupPath => {
          this.logger.info(`Backup creado: ${backupPath}`);
        })
        .catch(error => {
          this.logger.error('Error en backup automático:', error);
        });
    });

    // Limpieza de logs antiguos
    cron.schedule('0 3 * * 0', () => {
      this.logger.info('Limpiando logs antiguos...');
      // Implementar limpieza de logs
    });

    // Análisis de aprendizaje semanal
    cron.schedule('0 1 * * 1', () => {
      if (process.env.ENABLE_LEARNING_MODE === 'true') {
        this.logger.info('Ejecutando análisis de aprendizaje semanal...');
        this.learningService.performWeeklyAnalysis();
      }
    });

    this.logger.info('Tareas programadas configuradas');
  }

  async start() {
    try {
      // Verificar directorios necesarios
      const dirs = ['logs', 'data', 'backups', 'public'];
      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      this.server.listen(this.port, () => {
        this.logger.info(`
🎭 ============================================
   CARNIVALITO PRO ELITE v3.0 INICIADO
============================================
🌐 Servidor: http://${process.env.HOST || 'localhost'}:${this.port}
👑 Admin: http://${process.env.HOST || 'localhost'}:${this.port}/admin
🔒 Modo: ${process.env.NODE_ENV || 'development'}
🔑 APIs cifradas: ${this.apiKeyManager.validateKeyIntegrity().valid}
🧠 Aprendizaje: ${process.env.ENABLE_LEARNING_MODE === 'true' ? 'Activo' : 'Inactivo'}
🎤 Síntesis de voz: ${process.env.ENABLE_VOICE_SYNTHESIS === 'true' ? 'Activa' : 'Inactiva'}
============================================
        `);
      });

    } catch (error) {
      this.logger.error('Error iniciando servidor:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    this.logger.info('Cerrando servidor...');
    
    try {
      // Crear backup final
      await this.dbManager.createBackup();
      
      // Limpiar claves en memoria
      this.apiKeyManager.clearMemoryKeys();
      
      // Cerrar conexiones
      this.io.close();
      this.server.close();
      
      this.logger.info('Servidor cerrado correctamente');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error cerrando servidor:', error);
      process.exit(1);
    }
  }
}

// Manejo de señales de sistema
process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM, cerrando servidor...');
  if (global.server) {
    global.server.shutdown();
  }
});

process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT, cerrando servidor...');
  if (global.server) {
    global.server.shutdown();
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor si es el archivo principal
if (require.main === module) {
  const server = new CarnivalitoServer();
  global.server = server;
  server.start();
}

module.exports = CarnivalitoServer;
