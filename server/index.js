const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
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

    // HTTPS opcional
    const useHttps = process.env.USE_HTTPS === 'true';
    if (useHttps) {
      const keyPath = process.env.SSL_KEY || './ssl/key.pem';
      const certPath = process.env.SSL_CERT || './ssl/cert.pem';
      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.error('Certificados SSL no encontrados. Desactiva USE_HTTPS o crea los certificados.');
        process.exit(1);
      }
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      this.server = https.createServer(options, this.app);
    } else {
      this.server = http.createServer(this.app);
    }

    this.port = process.env.PORT || 3001;
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
    // Helmet con CSP optimizado
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.tailwindcss.com", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com", "cdn.jsdelivr.net"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:", "http:", "https:"],
            mediaSrc: ["'self'", "blob:"]
          }
        }
      })
    );

    this.app.use(compression());

    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
      credentials: true
    }));

    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: { error: 'Demasiadas peticiones, espera un poquito.' },
      standardHeaders: true,
      legacyHeaders: false
    });

    const chatLimiter = rateLimit({
      windowMs: 60000,
      max: parseInt(process.env.CHAT_RATE_LIMIT) || 20,
      message: { error: 'Demasiados mensajes muy rápido.' }
    });

    this.app.use(limiter);
    this.app.use('/api/chat', chatLimiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(express.static(path.join(__dirname, '../public')));

    // Logger de requests
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('User-Agent') });
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
    this.app.use('/api/chat', require('./routes/chat')(this.aiService, this.learningService, this.dbManager));
    this.app.use('/api/voice', require('./routes/voice')(this.voiceService));
    this.app.use('/api/poetry', require('./routes/poetry')(this.poetryService));
    this.app.use('/api/admin', require('./routes/admin')(this.dbManager, this.apiKeyManager, this.learningService));

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
          memoryUsage: process.memoryUsage(),
          apiKeysValid: keyIntegrity.valid,
          apiKeysTotal: keyIntegrity.total
        }
      });
    });

    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    this.app.use('*', (req, res) => res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl }));

    this.app.use((err, req, res, next) => {
      this.logger.error('Error no manejado:', err);
      res.status(500).json({ error: 'Error interno del servidor', timestamp: new Date().toISOString() });
    });
  }

  initializeSocketHandlers() {
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      this.logger.info('Cliente conectado:', socket.id);
      socket.on('join_room', (room) => socket.join(room));
      socket.on('chat_message', async (data) => {
        try {
          const response = await this.aiService.processMessage(data.message, data.userId, data.context);
          socket.emit('chat_response', { response, timestamp: new Date().toISOString(), messageId: data.messageId });
          if (process.env.ENABLE_LEARNING_MODE === 'true') {
            this.learningService.analyzeInteraction(data.message, response);
          }
        } catch (error) {
          this.logger.error('Error procesando mensaje del socket:', error);
          socket.emit('chat_error', { error: 'Error procesando mensaje', messageId: data.messageId });
        }
      });
      socket.on('voice_synthesis', async (data) => {
        try {
          const audioBuffer = await this.voiceService.synthesizeText(data.text, data.options);
          socket.emit('voice_ready', { audio: audioBuffer.toString('base64'), messageId: data.messageId });
        } catch (error) {
          this.logger.error('Error en síntesis de voz:', error);
          socket.emit('voice_error', { error: 'Error generando audio', messageId: data.messageId });
        }
      });
      socket.on('disconnect', () => this.logger.info('Cliente desconectado:', socket.id));
    });
  }

  initializeScheduledTasks() {
    cron.schedule('0 2 * * *', () => this.dbManager.createBackup().then(path => this.logger.info(`Backup creado: ${path}`)).catch(err => this.logger.error(err)));
    cron.schedule('0 3 * * 0', () => this.logger.info('Limpiando logs antiguos...'));
    cron.schedule('0 1 * * 1', () => {
      if (process.env.ENABLE_LEARNING_MODE === 'true') this.learningService.performWeeklyAnalysis();
    });
    this.logger.info('Tareas programadas configuradas');
  }

  async start() {
    ['logs', 'data', 'backups', 'public'].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

    this.server.listen(this.port, () => {
      const protocol = process.env.USE_HTTPS === 'true' ? 'https' : 'http';
      this.logger.info(`
🎭 Carnivalito Pro Elite 3.0 iniciado
🌐 Servidor: ${protocol}://${process.env.HOST || 'localhost'}:${this.port}
👑 Admin: ${protocol}://${process.env.HOST || 'localhost'}:${this.port}/admin
🔒 Modo: ${process.env.NODE_ENV || 'development'}
🔑 APIs cifradas: ${this.apiKeyManager.validateKeyIntegrity().valid}
🧠 Aprendizaje: ${process.env.ENABLE_LEARNING_MODE === 'true' ? 'Activo' : 'Inactivo'}
🎤 Síntesis de voz: ${process.env.ENABLE_VOICE_SYNTHESIS === 'true' ? 'Activa' : 'Inactiva'}
      `);
    });
  }

  async shutdown() {
    this.logger.info('Cerrando servidor...');
    try {
      await this.dbManager.createBackup();
      this.apiKeyManager.clearMemoryKeys();
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

process.on('SIGTERM', () => global.server?.shutdown());
process.on('SIGINT', () => global.server?.shutdown());
process.on('uncaughtException', (err) => { console.error(err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error(reason); process.exit(1); });

if (require.main === module) {
  const server = new CarnivalitoServer();
  global.server = server;
  server.start();
}

module.exports = CarnivalitoServer;
