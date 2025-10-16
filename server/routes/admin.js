const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');

module.exports = (dbManager, apiKeyManager, learningService) => {

  // Middleware de autenticación
  const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.admin_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = verified;
      next();
    } catch (err) {
      res.status(403).json({ error: 'Token inválido o expirado' });
    }
  };

  // Esquemas de validación
  const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required()
  });

  const apiKeySchema = Joi.object({
    service: Joi.string().valid('groq', 'huggingface', 'google_tts').required(),
    apiKey: Joi.string().min(10).max(200).required()
  });

  // Login de administrador
  router.post('/login', async (req, res) => {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: error.details[0].message
        });
      }

      const { username, password } = req.body;
      
      // Verificar credenciales
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'cadiz2025!';

      if (username !== adminUser) {
        console.warn(`Intento de login fallido: usuario ${username} desde ${req.ip}`);
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // Verificar contraseña (si está hasheada o en texto plano)
      let passwordValid = false;
      if (adminPass.startsWith('$2')) {
        // Contraseña hasheada
        passwordValid = await bcrypt.compare(password, adminPass);
      } else {
        // Contraseña en texto plano (desarrollo)
        passwordValid = password === adminPass;
      }

      if (!passwordValid) {
        console.warn(`Intento de login fallido: contraseña incorrecta para ${username} desde ${req.ip}`);
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // Generar token
      const token = jwt.sign(
        { username, role: 'admin', loginTime: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Configurar cookie segura
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });

      // Registrar login exitoso
      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'admin_login_success',
        JSON.stringify({ username }),
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Login exitoso',
        token,
        expiresIn: '8h',
        admin: { username }
      });

    } catch (error) {
      console.error('Error en login de admin:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Logout
  router.post('/logout', authMiddleware, async (req, res) => {
    try {
      res.clearCookie('admin_token');
      
      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'admin_logout',
        JSON.stringify({ username: req.admin.username }),
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Logout exitoso'
      });

    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error en logout' });
    }
  });

  // Dashboard principal
  router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
      // Obtener estadísticas generales
      const systemStats = await dbManager.getSystemStats();
      
      // Estadísticas de APIs
      const apiKeyIntegrity = apiKeyManager.validateKeyIntegrity();
      
      // Estadísticas de aprendizaje
      const learningStats = learningService.getStats();
      
      // Actividad reciente
      const recentActivity = await dbManager.allQuery(`
        SELECT action, details, ip_address, timestamp
        FROM activity_logs
        ORDER BY timestamp DESC
        LIMIT 20
      `);

      // Métricas del sistema
      const systemMetrics = await dbManager.allQuery(`
        SELECT metric_name, metric_value, timestamp
        FROM metrics
        WHERE category = 'learning'
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      // Estado del servidor
      const serverStatus = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      };

      res.json({
        success: true,
        dashboard: {
          stats: systemStats,
          apis: {
            integrity: apiKeyIntegrity,
            services: {
              groq: !!apiKeyManager.getAPIKey('groq'),
              huggingface: !!apiKeyManager.getAPIKey('huggingface'),
              googleTTS: !!apiKeyManager.getAPIKey('google_tts')
            }
          },
          learning: learningStats,
          recentActivity: recentActivity.map(activity => ({
            ...activity,
            details: typeof activity.details === 'string' 
              ? JSON.parse(activity.details) 
              : activity.details
          })),
          metrics: systemMetrics,
          server: serverStatus
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
    }
  });

  // Gestión de claves API
  router.get('/api-keys', authMiddleware, (req, res) => {
    try {
      const integrity = apiKeyManager.validateKeyIntegrity();
      
      res.json({
        success: true,
        apiKeys: {
          total: integrity.total,
          valid: integrity.valid,
          services: integrity.services,
          lastRotation: 'hace 2 horas', // Implementar tracking real
          nextRotation: 'en 22 horas'
        }
      });

    } catch (error) {
      console.error('Error obteniendo claves API:', error);
      res.status(500).json({ error: 'Error obteniendo información de APIs' });
    }
  });

  router.post('/api-keys', authMiddleware, async (req, res) => {
    try {
      const { error } = apiKeySchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: error.details[0].message
        });
      }

      const { service, apiKey } = req.body;

      // Actualizar clave API
      apiKeyManager.updateAPIKey(service, apiKey);

      // Registrar cambio
      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'api_key_updated',
        JSON.stringify({ service, admin: req.admin.username }),
        req.ip
      ]);

      res.json({
        success: true,
        message: `Clave API para ${service} actualizada correctamente`
      });

    } catch (error) {
      console.error('Error actualizando clave API:', error);
      res.status(500).json({ error: 'Error actualizando clave API' });
    }
  });

  // Sistema de aprendizaje
  router.get('/learning', authMiddleware, async (req, res) => {
    try {
      if (!learningService.isActive()) {
        return res.json({
          success: true,
          learning: {
            active: false,
            message: 'Sistema de aprendizaje deshabilitado'
          }
        });
      }

      // Estadísticas de aprendizaje
      const weeklyAnalysis = await learningService.performWeeklyAnalysis();
      const stats = learningService.getStats();

      // Interacciones recientes con feedback
      const recentFeedback = await dbManager.allQuery(`
        SELECT user_message, ai_response, user_feedback_rating, 
               user_feedback_text, created_at
        FROM learning_data
        WHERE user_feedback_rating IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10
      `);

      // Oportunidades de mejora
      const improvements = await dbManager.allQuery(`
        SELECT details, timestamp
        FROM activity_logs
        WHERE action = 'improvement_opportunity_detected'
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        learning: {
          active: true,
          stats,
          weeklyAnalysis,
          recentFeedback: recentFeedback.map(item => ({
            ...item,
            user_message: item.user_message.substring(0, 100) + '...',
            ai_response: item.ai_response.substring(0, 100) + '...'
          })),
          improvements: improvements.map(item => ({
            ...item,
            details: JSON.parse(item.details)
          }))
        }
      });

    } catch (error) {
      console.error('Error obteniendo datos de aprendizaje:', error);
      res.status(500).json({ error: 'Error obteniendo datos de aprendizaje' });
    }
  });

  // Forzar análisis de aprendizaje
  router.post('/learning/analyze', authMiddleware, async (req, res) => {
    try {
      if (!learningService.isActive()) {
        return res.status(400).json({
          error: 'Sistema de aprendizaje no está activo'
        });
      }

      const analysis = await learningService.performWeeklyAnalysis();

      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'manual_learning_analysis',
        JSON.stringify({ admin: req.admin.username, results: analysis }),
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Análisis de aprendizaje ejecutado manualmente',
        analysis
      });

    } catch (error) {
      console.error('Error en análisis manual:', error);
      res.status(500).json({ error: 'Error ejecutando análisis de aprendizaje' });
    }
  });

  // Gestión de usuarios
  router.get('/users', authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const users = await dbManager.allQuery(`
        SELECT userId, created_at, last_active, total_messages, total_sessions,
               preferences, status
        FROM users
        ORDER BY last_active DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const totalUsers = await dbManager.getQuery(`
        SELECT COUNT(*) as count FROM users
      `);

      res.json({
        success: true,
        users: users.map(user => ({
          ...user,
          preferences: user.preferences ? JSON.parse(user.preferences) : null
        })),
        pagination: {
          page,
          limit,
          total: totalUsers.count,
          pages: Math.ceil(totalUsers.count / limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ error: 'Error obteniendo lista de usuarios' });
    }
  });

  // Detalles de usuario específico
  router.get('/users/:userId', authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await dbManager.getUserProfile(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const conversations = await dbManager.getConversationHistory(userId, 20);
      
      const feedbackData = await dbManager.allQuery(`
        SELECT user_feedback_rating, COUNT(*) as count
        FROM learning_data
        WHERE user_message IN (
          SELECT message FROM conversations WHERE userId = ?
        )
        AND user_feedback_rating IS NOT NULL
        GROUP BY user_feedback_rating
      `, [userId]);

      res.json({
        success: true,
        user: {
          ...user,
          preferences: user.preferences ? JSON.parse(user.preferences) : null
        },
        recentConversations: conversations,
        feedbackStats: feedbackData
      });

    } catch (error) {
      console.error('Error obteniendo detalles de usuario:', error);
      res.status(500).json({ error: 'Error obteniendo detalles del usuario' });
    }
  });

  // Configuración del sistema
  router.get('/config', authMiddleware, async (req, res) => {
    try {
      const config = await dbManager.allQuery(`
        SELECT key, value, description, updated_at
        FROM system_config
        WHERE key NOT LIKE '%api_key%'
        ORDER BY key
      `);

      res.json({
        success: true,
        config: config.reduce((acc, item) => {
          acc[item.key] = {
            value: item.value,
            description: item.description,
            updatedAt: item.updated_at
          };
          return acc;
        }, {})
      });

    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({ error: 'Error obteniendo configuración del sistema' });
    }
  });

  // Actualizar configuración
  router.post('/config', authMiddleware, async (req, res) => {
    try {
      const { key, value, description } = req.body;

      if (!key || !value) {
        return res.status(400).json({
          error: 'Key y value son requeridos'
        });
      }

      await dbManager.runQuery(`
        INSERT OR REPLACE INTO system_config (key, value, description, updated_by, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [key, value, description || '', req.admin.username]);

      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'config_updated',
        JSON.stringify({ key, admin: req.admin.username }),
        req.ip
      ]);

      res.json({
        success: true,
        message: `Configuración ${key} actualizada correctamente`
      });

    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({ error: 'Error actualizando configuración' });
    }
  });

  // Backup del sistema
  router.post('/backup', authMiddleware, async (req, res) => {
    try {
      const backupPath = await dbManager.createBackup();
      const keyBackupPath = apiKeyManager.createSecureBackup();

      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'manual_backup_created',
        JSON.stringify({ 
          admin: req.admin.username, 
          dbBackup: backupPath,
          keyBackup: keyBackupPath
        }),
        req.ip
      ]);

      res.json({
        success: true,
        message: 'Backup creado correctamente',
        backups: {
          database: backupPath,
          apiKeys: keyBackupPath
        }
      });

    } catch (error) {
      console.error('Error creando backup:', error);
      res.status(500).json({ error: 'Error creando backup del sistema' });
    }
  });

  // Logs del sistema
  router.get('/logs', authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      const action = req.query.action;

      let query = `
        SELECT action, details, ip_address, timestamp
        FROM activity_logs
      `;
      let params = [];

      if (action) {
        query += ' WHERE action = ?';
        params.push(action);
      }

      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const logs = await dbManager.allQuery(query, params);

      const totalQuery = action 
        ? 'SELECT COUNT(*) as count FROM activity_logs WHERE action = ?'
        : 'SELECT COUNT(*) as count FROM activity_logs';
      const totalParams = action ? [action] : [];
      const total = await dbManager.getQuery(totalQuery, totalParams);

      res.json({
        success: true,
        logs: logs.map(log => ({
          ...log,
          details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
        })),
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo logs:', error);
      res.status(500).json({ error: 'Error obteniendo logs del sistema' });
    }
  });

  // Health check del panel de admin
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      services: {
        database: dbManager.isConnected(),
        apiKeyManager: apiKeyManager.validateKeyIntegrity().valid > 0,
        learningService: learningService.isActive()
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
};
