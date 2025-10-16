const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const Joi = require('joi');

module.exports = (aiService, learningService, dbManager) => {
  
  // Validación de esquemas
  const chatSchema = Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    userId: Joi.string().alphanum().min(3).max(50).required(),
    sessionId: Joi.string().alphanum().min(10).max(100),
    context: Joi.object({
      previousMessages: Joi.array().items(Joi.string()).max(10),
      userPreferences: Joi.object(),
      currentTopic: Joi.string().max(50)
    }).optional()
  });

  const feedbackSchema = Joi.object({
    interactionId: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    feedbackText: Joi.string().max(500).optional()
  });

  // Middleware de validación
  const validateRequest = (schema) => {
    return (req, res, next) => {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: error.details[0].message
        });
      }
      next();
    };
  };

  // Middleware de sanitización
  const sanitizeInput = (req, res, next) => {
    if (req.body.message) {
      req.body.message = sanitizeHtml(req.body.message, {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
    if (req.body.feedbackText) {
      req.body.feedbackText = sanitizeHtml(req.body.feedbackText, {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
    next();
  };

  // Chat principal con IA avanzada
  router.post('/', validateRequest(chatSchema), sanitizeInput, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { message, userId, sessionId, context = {} } = req.body;
      
      // Obtener historial del usuario para contexto
      const conversationHistory = await dbManager.getConversationHistory(userId, 10);
      
      // Enriquecer contexto
      const enrichedContext = {
        ...context,
        previousMessages: conversationHistory.map(c => c.message),
        userProfile: await dbManager.getUserProfile(userId),
        sessionId: sessionId || `session_${Date.now()}`
      };

      // Procesar mensaje con IA
      const aiResult = await aiService.processMessage(message, userId, enrichedContext);
      
      // Guardar conversación
      await dbManager.saveConversation({
        userId,
        message,
        response: aiResult.response,
        sessionId: enrichedContext.sessionId,
        contextData: enrichedContext,
        sentimentAnalysis: aiResult.analysis.sentiment,
        topicClassification: aiResult.analysis.topic.category,
        responseQualityScore: aiResult.metadata.qualityScore,
        responseTimeMs: aiResult.metadata.responseTime,
        aiModelUsed: aiResult.metadata.aiModel,
        ipAddress: req.ip
      });

      // Actualizar actividad del usuario
      await dbManager.updateUserActivity(userId, true);

      // Análisis para aprendizaje (si está habilitado)
      let learningAnalysis = null;
      if (learningService.isActive()) {
        learningAnalysis = await learningService.analyzeInteraction(
          message, 
          aiResult.response, 
          enrichedContext
        );
      }

      // Preparar respuesta
      const responseData = {
        reply: aiResult.response,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          ...aiResult.metadata,
          totalResponseTime: Date.now() - startTime,
          sentiment: aiResult.analysis.sentiment.label,
          topic: aiResult.analysis.topic.category,
          interactionId: learningAnalysis?.interactionId
        }
      };

      // Headers de cache
      res.set({
        'Cache-Control': 'no-store',
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-AI-Model': aiResult.metadata.aiModel
      });

      res.json(responseData);

    } catch (error) {
      console.error('Error en endpoint de chat:', error);
      
      res.status(500).json({
        error: 'Error procesando mensaje',
        messageId: `error_${Date.now()}`,
        fallbackReply: 'Lo siento, pisha. Algo ha fallado por aquí. ¿Probamos otra vez?',
        metadata: {
          error: true,
          responseTime: Date.now() - startTime
        }
      });
    }
  });

  // Endpoint para feedback de usuario
  router.post('/feedback', validateRequest(feedbackSchema), sanitizeInput, async (req, res) => {
    try {
      const { interactionId, rating, feedbackText = '' } = req.body;

      if (!learningService.isActive()) {
        return res.status(400).json({
          error: 'Sistema de aprendizaje no está activo'
        });
      }

      const result = await learningService.processFeedback(
        interactionId, 
        rating, 
        feedbackText
      );

      // Registrar evento de feedback
      await dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, ip_address, timestamp)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        'user_feedback_received',
        JSON.stringify({ interactionId, rating, hasText: !!feedbackText }),
        req.ip
      ]);

      res.json({
        success: true,
        message: rating >= 4 
          ? '¡Gracias por el feedback positivo, pisha!' 
          : 'Gracias por ayudarnos a mejorar, mostro.',
        ...result
      });

    } catch (error) {
      console.error('Error procesando feedback:', error);
      res.status(500).json({
        error: 'Error guardando feedback'
      });
    }
  });

  // Endpoint para obtener estadísticas de conversación
  router.get('/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const stats = await dbManager.allQuery(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT session_id) as total_sessions,
          AVG(response_quality_score) as avg_quality,
          topic_classification,
          COUNT(*) as topic_count
        FROM conversations 
        WHERE userId = ?
        GROUP BY topic_classification
        ORDER BY topic_count DESC
      `, [userId]);

      const userProfile = await dbManager.getUserProfile(userId);
      
      res.json({
        success: true,
        stats: {
          totalMessages: stats.reduce((sum, row) => sum + row.total_messages, 0),
          totalSessions: Math.max(...stats.map(row => row.total_sessions)),
          averageQuality: stats.length > 0 
            ? stats.reduce((sum, row) => sum + (row.avg_quality || 0), 0) / stats.length 
            : 0,
          topicBreakdown: stats.map(row => ({
            topic: row.topic_classification,
            count: row.topic_count,
            percentage: Math.round((row.topic_count / stats.reduce((sum, r) => sum + r.total_messages, 0)) * 100)
          }))
        },
        profile: userProfile
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        error: 'Error obteniendo estadísticas de usuario'
      });
    }
  });

  // Endpoint para obtener contexto de conversación
  router.get('/context/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      
      const conversations = await dbManager.getConversationHistory(userId, limit);
      
      // Análisis del contexto
      const topics = conversations.reduce((acc, conv) => {
        const topic = conv.topic_classification || 'general';
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

      const dominantTopic = Object.keys(topics).reduce((a, b) => 
        topics[a] > topics[b] ? a : b, 'general'
      );

      res.json({
        success: true,
        context: {
          recentMessages: conversations.slice(0, 5),
          totalConversations: conversations.length,
          dominantTopic,
          topicDistribution: topics,
          lastActive: conversations[0]?.timestamp
        }
      });

    } catch (error) {
      console.error('Error obteniendo contexto:', error);
      res.status(500).json({
        error: 'Error obteniendo contexto de conversación'
      });
    }
  });

  // Endpoint para generar resumen de conversación
  router.post('/summarize', async (req, res) => {
    try {
      const { userId, sessionId } = req.body;
      
      let query = 'SELECT message, response, timestamp, topic_classification FROM conversations WHERE userId = ?';
      let params = [userId];
      
      if (sessionId) {
        query += ' AND session_id = ?';
        params.push(sessionId);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT 50';
      
      const conversations = await dbManager.allQuery(query, params);
      
      if (conversations.length === 0) {
        return res.json({
          success: true,
          summary: 'No hay conversaciones para resumir'
        });
      }

      // Generar resumen básico
      const topics = conversations.reduce((acc, conv) => {
        const topic = conv.topic_classification || 'general';
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

      const topTopic = Object.keys(topics).reduce((a, b) => 
        topics[a] > topics[b] ? a : b
      );

      const summary = `Conversación con ${conversations.length} intercambios. ` +
        `Tema principal: ${topTopic}. ` +
        `Otros temas: ${Object.keys(topics).filter(t => t !== topTopic).join(', ')}.`;

      res.json({
        success: true,
        summary,
        metadata: {
          totalExchanges: conversations.length,
          timeSpan: {
            start: conversations[conversations.length - 1]?.timestamp,
            end: conversations[0]?.timestamp
          },
          topicBreakdown: topics
        }
      });

    } catch (error) {
      console.error('Error generando resumen:', error);
      res.status(500).json({
        error: 'Error generando resumen de conversación'
      });
    }
  });

  // Endpoint para limpiar conversaciones antiguas de un usuario
  router.delete('/cleanup/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const daysToKeep = parseInt(req.query.days) || 30;
      
      const result = await dbManager.runQuery(`
        DELETE FROM conversations 
        WHERE userId = ? 
        AND timestamp < datetime('now', '-${daysToKeep} days')
      `, [userId]);

      res.json({
        success: true,
        message: `Limpieza completada para usuario ${userId}`,
        deletedConversations: result.changes
      });

    } catch (error) {
      console.error('Error en limpieza:', error);
      res.status(500).json({
        error: 'Error limpiando conversaciones'
      });
    }
  });

  // Health check del servicio de chat
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      services: {
        ai: aiService ? 'active' : 'inactive',
        learning: learningService.isActive() ? 'active' : 'inactive',
        database: dbManager.isConnected() ? 'connected' : 'disconnected'
      },
      stats: learningService.getStats(),
      timestamp: new Date().toISOString()
    });
  });

  return router;
};
