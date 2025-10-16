const natural = require('natural');

class LearningService {
  constructor(dbManager, logger) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.learningThreshold = parseFloat(process.env.LEARNING_THRESHOLD) || 0.7;
    this.responsePatterns = new Map();
    this.userFeedbackCache = new Map();
    this.similarityCalculator = new natural.JaroWinklerDistance();
    this.initializeLearning();
  }

  async initializeLearning() {
    try {
      // Cargar patrones existentes de la base de datos
      await this.loadExistingPatterns();
      
      // Inicializar métricas de aprendizaje
      await this.initializeMetrics();
      
      this.logger.info('Sistema de aprendizaje inicializado correctamente');
    } catch (error) {
      this.logger.error('Error inicializando sistema de aprendizaje:', error);
    }
  }

  async loadExistingPatterns() {
    try {
      const patterns = await this.dbManager.allQuery(`
        SELECT user_message, ai_response, user_feedback_rating, 
               response_effectiveness, learning_category
        FROM learning_data 
        WHERE user_feedback_rating >= ? 
        AND improvement_applied = FALSE
        ORDER BY created_at DESC
        LIMIT 1000
      `, [this.learningThreshold * 5]); // Convertir a escala 1-5

      patterns.forEach(pattern => {
        const key = this.generatePatternKey(pattern.user_message);
        this.responsePatterns.set(key, {
          response: pattern.ai_response,
          effectiveness: pattern.response_effectiveness,
          category: pattern.learning_category,
          usageCount: 1
        });
      });

      this.logger.info(`Cargados ${patterns.length} patrones de aprendizaje`);
    } catch (error) {
      this.logger.error('Error cargando patrones existentes:', error);
    }
  }

  async initializeMetrics() {
    const metrics = [
      { name: 'total_interactions', value: 0, category: 'learning' },
      { name: 'positive_feedback_rate', value: 0, category: 'learning' },
      { name: 'learning_improvements', value: 0, category: 'learning' },
      { name: 'response_effectiveness_avg', value: 0.5, category: 'learning' }
    ];

    for (const metric of metrics) {
      try {
        await this.dbManager.saveMetric(
          metric.name, 
          metric.value, 
          null, 
          metric.category
        );
      } catch (error) {
        // Métrica ya existe, continuar
      }
    }
  }

  async analyzeInteraction(userMessage, aiResponse, context = {}) {
    try {
      const interactionId = this.generateInteractionId(userMessage, aiResponse);
      
      // Análisis automático de la respuesta
      const analysisResults = await this.analyzeResponseQuality(
        userMessage, 
        aiResponse, 
        context
      );

      // Guardar datos para aprendizaje
      await this.dbManager.saveLearningData({
        interactionId,
        userMessage,
        aiResponse,
        contextSimilarityScore: analysisResults.contextSimilarity,
        responseEffectiveness: analysisResults.effectiveness,
        learningCategory: analysisResults.category
      });

      // Detectar patrones de mejora
      const improvementOpportunity = await this.detectImprovementOpportunity(
        userMessage, 
        aiResponse,
        analysisResults
      );

      if (improvementOpportunity) {
        await this.recordImprovementOpportunity(improvementOpportunity);
      }

      // Actualizar métricas
      await this.updateLearningMetrics(analysisResults);

      return {
        interactionId,
        analysis: analysisResults,
        improvementDetected: !!improvementOpportunity
      };

    } catch (error) {
      this.logger.error('Error analizando interacción:', error);
      return null;
    }
  }

  async analyzeResponseQuality(userMessage, aiResponse, context) {
    const analysis = {
      effectiveness: 0.5,
      contextSimilarity: 0,
      category: 'general',
      factors: []
    };

    // 1. Análisis de longitud apropiada
    const responseLength = aiResponse.length;
    if (responseLength >= 50 && responseLength <= 300) {
      analysis.effectiveness += 0.1;
      analysis.factors.push('longitud_apropiada');
    } else if (responseLength < 20) {
      analysis.effectiveness -= 0.2;
      analysis.factors.push('respuesta_muy_corta');
    } else if (responseLength > 500) {
      analysis.effectiveness -= 0.1;
      analysis.factors.push('respuesta_muy_larga');
    }

    // 2. Análisis de personalidad gaditana
    const gaditanWords = ['pisha', 'mostro', 'zambombazo', 'salero', 'olé', 'viva'];
    const hasGaditanPersonality = gaditanWords.some(word => 
      aiResponse.toLowerCase().includes(word)
    );
    
    if (hasGaditanPersonality) {
      analysis.effectiveness += 0.15;
      analysis.factors.push('personalidad_gaditana');
    }

    // 3. Análisis de relevancia temática
    const themeRelevance = this.analyzeThemeRelevance(userMessage, aiResponse);
    analysis.effectiveness += themeRelevance.score;
    analysis.category = themeRelevance.category;
    analysis.factors.push(`tema_${themeRelevance.category}`);

    // 4. Análisis de seguimiento conversacional
    if (aiResponse.includes('?')) {
      analysis.effectiveness += 0.1;
      analysis.factors.push('fomenta_conversacion');
    }

    // 5. Análisis de contexto similar
    if (context.previousMessages) {
      analysis.contextSimilarity = await this.calculateContextSimilarity(
        userMessage, 
        context.previousMessages
      );
    }

    // 6. Análisis de emociones apropiadas
    const emotionalTone = this.analyzeEmotionalTone(userMessage, aiResponse);
    analysis.effectiveness += emotionalTone.appropriateResponse ? 0.1 : -0.1;
    analysis.factors.push(`tono_${emotionalTone.detected}`);

    // Normalizar efectividad entre 0 y 1
    analysis.effectiveness = Math.max(0, Math.min(1, analysis.effectiveness));

    return analysis;
  }

  analyzeThemeRelevance(userMessage, aiResponse) {
    const themes = {
      carnaval: {
        keywords: ['carnaval', 'chirigota', 'comparsa', 'coro', 'cuarteto', 'coac', 'falla'],
        responses: ['carnaval', 'coac', 'falla', 'chirigota', 'comparsa']
      },
      cadiz: {
        keywords: ['cadiz', 'cádiz', 'gaditano', 'tacita', 'caleta'],
        responses: ['cádiz', 'gaditano', 'tacita', 'caleta', 'mar']
      },
      futbol: {
        keywords: ['futbol', 'fútbol', 'cadiz cf', 'mirandilla'],
        responses: ['cádiz cf', 'fútbol', 'amarillo', 'submarino']
      }
    };

    const userLower = userMessage.toLowerCase();
    const responseLower = aiResponse.toLowerCase();

    for (const [category, data] of Object.entries(themes)) {
      const userHasTheme = data.keywords.some(keyword => userLower.includes(keyword));
      const responseHasTheme = data.responses.some(keyword => responseLower.includes(keyword));

      if (userHasTheme) {
        return {
          category,
          score: responseHasTheme ? 0.2 : -0.1,
          matched: responseHasTheme
        };
      }
    }

    return { category: 'general', score: 0, matched: true };
  }

  analyzeEmotionalTone(userMessage, aiResponse) {
    const userTone = this.detectEmotionalTone(userMessage);
    const responseTone = this.detectEmotionalTone(aiResponse);

    // Verificar si la respuesta es apropiada para el tono del usuario
    const appropriateResponses = {
      positive: ['positive', 'enthusiastic'],
      negative: ['supportive', 'empathetic'],
      neutral: ['positive', 'neutral', 'enthusiastic'],
      question: ['helpful', 'informative']
    };

    const isAppropriate = appropriateResponses[userTone]?.includes(responseTone) || false;

    return {
      userTone,
      responseTone,
      detected: responseTone,
      appropriateResponse: isAppropriate
    };
  }

  detectEmotionalTone(text) {
    const lowerText = text.toLowerCase();

    // Palabras positivas
    const positiveWords = ['bueno', 'genial', 'perfecto', 'excelente', 'me gusta', 'gracias'];
    if (positiveWords.some(word => lowerText.includes(word))) {
      return 'positive';
    }

    // Palabras negativas
    const negativeWords = ['mal', 'triste', 'problema', 'error', 'no me gusta'];
    if (negativeWords.some(word => lowerText.includes(word))) {
      return 'negative';
    }

    // Preguntas
    if (lowerText.includes('?') || lowerText.startsWith('qué') || lowerText.startsWith('cómo')) {
      return 'question';
    }

    // Entusiasmo
    const enthusiasticWords = ['olé', 'viva', 'zambombazo', '!'];
    if (enthusiasticWords.some(word => lowerText.includes(word))) {
      return 'enthusiastic';
    }

    return 'neutral';
  }

  async calculateContextSimilarity(currentMessage, previousMessages) {
    if (!previousMessages || previousMessages.length === 0) return 0;

    let maxSimilarity = 0;

    for (const prevMessage of previousMessages.slice(-5)) { // Últimos 5 mensajes
      const similarity = this.similarityCalculator(
        currentMessage.toLowerCase(), 
        prevMessage.toLowerCase()
      );
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  async detectImprovementOpportunity(userMessage, aiResponse, analysis) {
    // Detectar oportunidades de mejora basadas en análisis
    const opportunities = [];

    if (analysis.effectiveness < 0.6) {
      opportunities.push({
        type: 'low_effectiveness',
        severity: 'high',
        description: 'Respuesta con efectividad baja',
        suggestion: 'Revisar relevancia temática y personalidad gaditana'
      });
    }

    if (!analysis.factors.includes('personalidad_gaditana')) {
      opportunities.push({
        type: 'missing_personality',
        severity: 'medium',
        description: 'Falta personalidad gaditana característica',
        suggestion: 'Incluir expresiones como "pisha", "mostro", "salero"'
      });
    }

    if (analysis.factors.includes('respuesta_muy_corta')) {
      opportunities.push({
        type: 'response_too_short',
        severity: 'medium',
        description: 'Respuesta demasiado breve',
        suggestion: 'Expandir respuesta con más contexto carnavalero'
      });
    }

    // Buscar patrones similares con mejor efectividad
    const betterPattern = await this.findBetterPattern(userMessage, analysis.effectiveness);
    if (betterPattern) {
      opportunities.push({
        type: 'better_pattern_available',
        severity: 'low',
        description: 'Existe un patrón similar con mejor efectividad',
        suggestion: `Considerar adaptación del patrón: ${betterPattern.response.substring(0, 50)}...`
      });
    }

    return opportunities.length > 0 ? {
      userMessage,
      aiResponse,
      opportunities,
      analysis
    } : null;
  }

  async findBetterPattern(userMessage, currentEffectiveness) {
    try {
      const similarPatterns = await this.dbManager.allQuery(`
        SELECT user_message, ai_response, response_effectiveness
        FROM learning_data
        WHERE response_effectiveness > ?
        ORDER BY response_effectiveness DESC
        LIMIT 100
      `, [currentEffectiveness + 0.1]);

      for (const pattern of similarPatterns) {
        const similarity = this.similarityCalculator(
          userMessage.toLowerCase(),
          pattern.user_message.toLowerCase()
        );

        if (similarity > 0.7) { // 70% de similitud
          return pattern;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error buscando mejores patrones:', error);
      return null;
    }
  }

  async recordImprovementOpportunity(opportunity) {
    try {
      // Guardar oportunidad de mejora para revisión posterior
      await this.dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, timestamp)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [
        'improvement_opportunity_detected',
        JSON.stringify(opportunity)
      ]);

      this.logger.info('Oportunidad de mejora registrada', {
        userMessage: opportunity.userMessage.substring(0, 50),
        opportunityCount: opportunity.opportunities.length
      });

    } catch (error) {
      this.logger.error('Error registrando oportunidad de mejora:', error);
    }
  }

  async processFeedback(interactionId, rating, feedbackText = '') {
    try {
      // Actualizar datos de aprendizaje con feedback del usuario
      await this.dbManager.runQuery(`
        UPDATE learning_data 
        SET user_feedback_rating = ?, 
            user_feedback_text = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE interaction_id = ?
      `, [rating, feedbackText, interactionId]);

      // Procesar feedback para aprendizaje
      if (rating >= 4) { // Feedback positivo
        await this.reinforcePattern(interactionId);
      } else if (rating <= 2) { // Feedback negativo
        await this.markForImprovement(interactionId);
      }

      // Actualizar métricas de feedback
      await this.updateFeedbackMetrics(rating);

      this.logger.info(`Feedback procesado: ${rating}/5 para interacción ${interactionId}`);

      return { success: true, interactionId, rating };

    } catch (error) {
      this.logger.error('Error procesando feedback:', error);
      throw error;
    }
  }

  async reinforcePattern(interactionId) {
    try {
      const interaction = await this.dbManager.getQuery(`
        SELECT user_message, ai_response 
        FROM learning_data 
        WHERE interaction_id = ?
      `, [interactionId]);

      if (interaction) {
        const patternKey = this.generatePatternKey(interaction.user_message);
        
        // Reforzar patrón exitoso
        if (this.responsePatterns.has(patternKey)) {
          const pattern = this.responsePatterns.get(patternKey);
          pattern.usageCount++;
          pattern.effectiveness = Math.min(1.0, pattern.effectiveness + 0.05);
        } else {
          this.responsePatterns.set(patternKey, {
            response: interaction.ai_response,
            effectiveness: 0.8,
            category: 'user_approved',
            usageCount: 1
          });
        }
      }
    } catch (error) {
      this.logger.error('Error reforzando patrón:', error);
    }
  }

  async markForImprovement(interactionId) {
    try {
      await this.dbManager.runQuery(`
        UPDATE learning_data 
        SET improvement_applied = FALSE
        WHERE interaction_id = ?
      `, [interactionId]);

      // Registrar para análisis posterior
      await this.dbManager.runQuery(`
        INSERT INTO activity_logs (action, details, timestamp)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [
        'negative_feedback_received',
        JSON.stringify({ interactionId })
      ]);

    } catch (error) {
      this.logger.error('Error marcando para mejora:', error);
    }
  }

  async updateLearningMetrics(analysis) {
    try {
      // Actualizar métricas de efectividad promedio
      await this.dbManager.saveMetric(
        'response_effectiveness_sample',
        analysis.effectiveness,
        { factors: analysis.factors },
        'learning'
      );

      // Incrementar contador de interacciones
      await this.dbManager.saveMetric(
        'total_interactions_increment',
        1,
        null,
        'learning'
      );

    } catch (error) {
      this.logger.error('Error actualizando métricas de aprendizaje:', error);
    }
  }

  async updateFeedbackMetrics(rating) {
    try {
      await this.dbManager.saveMetric(
        'user_feedback_sample',
        rating,
        null,
        'learning'
      );

      if (rating >= 4) {
        await this.dbManager.saveMetric(
          'positive_feedback_count',
          1,
          null,
          'learning'
        );
      }

    } catch (error) {
      this.logger.error('Error actualizando métricas de feedback:', error);
    }
  }

  async performWeeklyAnalysis() {
    try {
      this.logger.info('Iniciando análisis semanal de aprendizaje...');

      // Analizar tendencias de la semana
      const weeklyStats = await this.getWeeklyStats();
      
      // Identificar patrones de mejora
      const improvementPatterns = await this.identifyImprovementPatterns();
      
      // Generar recomendaciones
      const recommendations = this.generateRecommendations(weeklyStats, improvementPatterns);
      
      // Guardar análisis
      await this.dbManager.saveMetric(
        'weekly_analysis',
        weeklyStats.averageEffectiveness,
        {
          stats: weeklyStats,
          patterns: improvementPatterns,
          recommendations
        },
        'learning'
      );

      this.logger.info('Análisis semanal completado', {
        effectiveness: weeklyStats.averageEffectiveness,
        improvements: improvementPatterns.length,
        recommendations: recommendations.length
      });

      return {
        stats: weeklyStats,
        patterns: improvementPatterns,
        recommendations
      };

    } catch (error) {
      this.logger.error('Error en análisis semanal:', error);
      throw error;
    }
  }

  async getWeeklyStats() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const stats = await this.dbManager.getQuery(`
      SELECT 
        COUNT(*) as total_interactions,
        AVG(response_effectiveness) as avg_effectiveness,
        AVG(user_feedback_rating) as avg_feedback,
        COUNT(CASE WHEN user_feedback_rating >= 4 THEN 1 END) as positive_feedback_count
      FROM learning_data
      WHERE created_at >= ?
    `, [oneWeekAgo]);

    return {
      totalInteractions: stats?.total_interactions || 0,
      averageEffectiveness: stats?.avg_effectiveness || 0,
      averageFeedback: stats?.avg_feedback || 0,
      positiveeFeedbackRate: stats?.total_interactions > 0 
        ? (stats.positive_feedback_count / stats.total_interactions)
        : 0
    };
  }

  async identifyImprovementPatterns() {
    try {
      const patterns = await this.dbManager.allQuery(`
        SELECT learning_category, COUNT(*) as frequency,
               AVG(response_effectiveness) as avg_effectiveness
        FROM learning_data
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY learning_category
        HAVING COUNT(*) >= 5
        ORDER BY avg_effectiveness ASC
      `);

      return patterns.map(pattern => ({
        category: pattern.learning_category,
        frequency: pattern.frequency,
        effectiveness: pattern.avg_effectiveness,
        needsImprovement: pattern.avg_effectiveness < this.learningThreshold
      }));

    } catch (error) {
      this.logger.error('Error identificando patrones de mejora:', error);
      return [];
    }
  }

  generateRecommendations(stats, patterns) {
    const recommendations = [];

    if (stats.averageEffectiveness < 0.6) {
      recommendations.push({
        priority: 'high',
        type: 'overall_effectiveness',
        description: 'La efectividad general está por debajo del umbral',
        action: 'Revisar y mejorar patrones de respuesta más utilizados'
      });
    }

    if (stats.averageFeedback < 3.5) {
      recommendations.push({
        priority: 'high',
        type: 'user_satisfaction',
        description: 'La satisfacción del usuario está baja',
        action: 'Analizar respuestas mal valoradas y ajustar personalidad'
      });
    }

    patterns.filter(p => p.needsImprovement).forEach(pattern => {
      recommendations.push({
        priority: 'medium',
        type: 'category_improvement',
        description: `La categoría ${pattern.category} necesita mejoras`,
        action: `Fortalecer respuestas en contexto de ${pattern.category}`
      });
    });

    return recommendations;
  }

  generatePatternKey(message) {
    // Generar clave normalizada para identificar patrones similares
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .slice(0, 5) // Primeras 5 palabras
      .join('_');
  }

  generateInteractionId(userMessage, aiResponse) {
    const timestamp = Date.now();
    const content = userMessage + aiResponse;
    const hash = require('crypto')
      .createHash('md5')
      .update(content + timestamp)
      .digest('hex');
    return `int_${hash.substring(0, 12)}`;
  }

  isActive() {
    return process.env.ENABLE_LEARNING_MODE === 'true';
  }

  getStats() {
    return {
      patternsLoaded: this.responsePatterns.size,
      learningThreshold: this.learningThreshold,
      isActive: this.isActive()
    };
  }
}

module.exports = LearningService;
