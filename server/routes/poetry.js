const express = require('express');
const router = express.Router();
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

module.exports = (poetryService) => {

  // Esquemas de validación
  const analyzeSchema = Joi.object({
    text: Joi.string().min(10).max(5000).required(),
    analysisLevel: Joi.string().valid('basic', 'complete').optional(),
    userId: Joi.string().alphanum().min(3).max(50).optional()
  });

  const generateSchema = Joi.object({
    theme: Joi.string().min(2).max(100).required(),
    style: Joi.string().valid('chirigota', 'comparsa', 'coro', 'cuarteto', 'copla', 'tango', 'solea').optional(),
    verses: Joi.number().integer().min(1).max(20).optional(),
    userId: Joi.string().alphanum().min(3).max(50).optional()
  });

  // Middleware de validación y sanitización
  const validateAndSanitize = (schema) => {
    return (req, res, next) => {
      // Sanitizar texto de entrada
      if (req.body.text) {
        req.body.text = sanitizeHtml(req.body.text, {
          allowedTags: [],
          allowedAttributes: {}
        });
      }
      if (req.body.theme) {
        req.body.theme = sanitizeHtml(req.body.theme, {
          allowedTags: [],
          allowedAttributes: {}
        });
      }

      // Validar esquema
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

  // Análisis completo de poesía
  router.post('/analyze', validateAndSanitize(analyzeSchema), async (req, res) => {
    const startTime = Date.now();

    try {
      const { text, analysisLevel = 'complete', userId } = req.body;

      // Realizar análisis poético
      const analysis = await poetryService.analyzePoem(text, analysisLevel);
      
      // Guardar análisis en base de datos si hay userId
      if (userId && poetryService.dbManager) {
        await poetryService.dbManager.runQuery(`
          INSERT INTO poetry_analysis (
            userId, original_text, verses_count, syllable_analysis,
            rhyme_scheme, meter_analysis, sentiment_score, 
            carnaval_style_score, processing_time_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          text,
          analysis.totalVerses,
          JSON.stringify(analysis.metrics.verses.map(v => v.syllables)),
          analysis.rhyme.scheme,
          JSON.stringify(analysis.metrics),
          analysis.sentiment?.score || 0,
          analysis.carnavalStyle?.score || 0,
          analysis.processingTime
        ]);
      }

      // Preparar respuesta
      const response = {
        success: true,
        analysis,
        recommendations: analysis.improvements || [],
        metadata: {
          processingTime: Date.now() - startTime,
          analysisLevel,
          textLength: text.length,
          timestamp: new Date().toISOString()
        }
      };

      // Añadir explicación en español
      response.explanation = buildSpanishExplanation(analysis);

      res.json(response);

    } catch (error) {
      console.error('Error analizando poesía:', error);
      res.status(500).json({
        error: 'Error analizando el poema',
        message: error.message,
        processingTime: Date.now() - startTime
      });
    }
  });

  // Generación de poesía carnavalera
  router.post('/generate', validateAndSanitize(generateSchema), async (req, res) => {
    const startTime = Date.now();

    try {
      const { theme, style = 'copla', verses = 4, userId } = req.body;

      // Generar poesía
      const result = await poetryService.generateCarnavalPoetry(theme, style, verses);

      // Guardar contenido generado si hay userId
      if (userId && poetryService.dbManager) {
        await poetryService.dbManager.runQuery(`
          INSERT INTO generated_content (
            userId, content_type, original_prompt, generated_text,
            style_analysis, quality_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          userId,
          style,
          theme,
          result.poem,
          JSON.stringify(result.analysis),
          result.analysis.metrics?.statistics?.averageSyllables || 0
        ]);
      }

      const response = {
        success: true,
        poem: result.poem,
        style: result.style,
        theme: result.theme,
        analysis: result.analysis,
        metadata: {
          ...result.metadata,
          processingTime: Date.now() - startTime
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error generando poesía:', error);
      res.status(500).json({
        error: 'Error generando poesía carnavalera',
        message: error.message,
        processingTime: Date.now() - startTime
      });
    }
  });

  // Análisis rápido de métrica (solo sílabas y rima)
  router.post('/quick-analysis', async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.length > 2000) {
        return res.status(400).json({
          error: 'Texto inválido o demasiado largo (máximo 2000 caracteres)'
        });
      }

      // Análisis básico más rápido
      const verses = text.split(/\n+/).filter(line => line.trim().length > 0);
      
      const quickAnalysis = {
        versesCount: verses.length,
        syllables: verses.map(verse => poetryService.countSyllables(verse)),
        rhymePattern: poetryService.analyzeRhyme(verses).scheme,
        isOctosyllabic: verses.every(verse => {
          const syllables = poetryService.countSyllables(verse);
          return syllables >= 7 && syllables <= 9;
        })
      };

      res.json({
        success: true,
        quickAnalysis,
        message: quickAnalysis.isOctosyllabic 
          ? '¡Perfecto para el Carnaval! Métrica octosílaba tradicional.'
          : 'Métrica libre. Considera usar octosílabos para estilo carnavalero.',
        processingTime: 'less than 100ms'
      });

    } catch (error) {
      console.error('Error en análisis rápido:', error);
      res.status(500).json({
        error: 'Error en análisis rápido'
      });
    }
  });

  // Sugerencias de mejora para versos específicos
  router.post('/improve', async (req, res) => {
    try {
      const { verse, targetSyllables = 8 } = req.body;

      if (!verse || typeof verse !== 'string' || verse.length > 200) {
        return res.status(400).json({
          error: 'Verso inválido (máximo 200 caracteres)'
        });
      }

      const currentSyllables = poetryService.countSyllables(verse);
      const difference = targetSyllables - currentSyllables;
      
      const suggestions = [];

      if (difference > 0) {
        suggestions.push({
          type: 'add_syllables',
          description: `Añadir ${difference} sílaba${difference > 1 ? 's' : ''}`,
          examples: [
            'Usar artículos: "el mar" en lugar de "mar"',
            'Añadir adjetivos: "azul mar" en lugar de "mar"',
            'Usar contracciones: "que es" en lugar de "que\'s"'
          ]
        });
      } else if (difference < 0) {
        suggestions.push({
          type: 'remove_syllables',
          description: `Reducir ${Math.abs(difference)} sílaba${Math.abs(difference) > 1 ? 's' : ''}`,
          examples: [
            'Usar contracciones: "del" en lugar de "de el"',
            'Eliminar artículos innecesarios',
            'Usar sinónimos más cortos'
          ]
        });
      } else {
        suggestions.push({
          type: 'perfect_meter',
          description: '¡Perfecto! Ya tienes la métrica ideal',
          examples: ['El verso tiene exactamente 8 sílabas como las coplas tradicionales']
        });
      }

      // Analizar rima potencial
      const ending = poetryService.getVerseEnding(verse);
      const rhymeWords = poetryService.rhymeDatabase.consonante[ending.slice(-2)] || 
                       poetryService.rhymeDatabase.asonante[ending] || [];

      if (rhymeWords.length > 0) {
        suggestions.push({
          type: 'rhyme_suggestions',
          description: 'Palabras que riman con este verso',
          examples: rhymeWords.slice(0, 5)
        });
      }

      res.json({
        success: true,
        originalVerse: verse,
        currentSyllables,
        targetSyllables,
        difference,
        suggestions,
        analysis: {
          ending: ending,
          words: verse.split(/\s+/).length,
          hasCarnavalWords: /carnaval|gaditano|cádiz|fiesta|alegría/i.test(verse)
        }
      });

    } catch (error) {
      console.error('Error generando sugerencias:', error);
      res.status(500).json({
        error: 'Error generando sugerencias de mejora'
      });
    }
  });

  // Endpoint para obtener patrones de rima
  router.get('/rhymes/:word', (req, res) => {
    try {
      const { word } = req.params;
      
      if (!word || word.length > 50) {
        return res.status(400).json({
          error: 'Palabra inválida'
        });
      }

      const cleanWord = word.toLowerCase().trim();
      const ending = cleanWord.slice(-2);
      const vowelPattern = cleanWord.replace(/[^aeiouáéíóú]/g, '').slice(-2);

      // Buscar rimas consonantes
      const consonantRhymes = [];
      for (const [pattern, words] of Object.entries(poetryService.rhymeDatabase.consonante)) {
        if (pattern === ending) {
          consonantRhymes.push(...words.filter(w => w !== cleanWord));
        }
      }

      // Buscar rimas asonantes
      const asonantRhymes = [];
      for (const [pattern, words] of Object.entries(poetryService.rhymeDatabase.asonante)) {
        if (pattern === vowelPattern) {
          asonantRhymes.push(...words.filter(w => w !== cleanWord));
        }
      }

      res.json({
        success: true,
        word: cleanWord,
        rhymes: {
          consonant: consonantRhymes.slice(0, 10),
          asonant: asonantRhymes.slice(0, 10)
        },
        patterns: {
          consonant: ending,
          asonant: vowelPattern
        }
      });

    } catch (error) {
      console.error('Error buscando rimas:', error);
      res.status(500).json({
        error: 'Error buscando rimas'
      });
    }
  });

  // Estadísticas de usuario en poesía
  router.get('/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      if (!poetryService.dbManager) {
        return res.status(503).json({
          error: 'Base de datos no disponible'
        });
      }

      const stats = await poetryService.dbManager.getQuery(`
        SELECT 
          COUNT(*) as total_analyses,
          AVG(carnaval_style_score) as avg_style_score,
          AVG(verses_count) as avg_verses,
          COUNT(CASE WHEN carnaval_style_score >= 0.7 THEN 1 END) as high_quality_count
        FROM poetry_analysis
        WHERE userId = ?
      `, [userId]);

      const generatedContent = await poetryService.dbManager.allQuery(`
        SELECT content_type, COUNT(*) as count
        FROM generated_content
        WHERE userId = ?
        GROUP BY content_type
      `, [userId]);

      res.json({
        success: true,
        stats: {
          totalAnalyses: stats?.total_analyses || 0,
          averageStyleScore: stats?.avg_style_score || 0,
          averageVerses: stats?.avg_verses || 0,
          highQualityCount: stats?.high_quality_count || 0,
          generatedByType: generatedContent.reduce((acc, item) => {
            acc[item.content_type] = item.count;
            return acc;
          }, {})
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de poesía:', error);
      res.status(500).json({
        error: 'Error obteniendo estadísticas'
      });
    }
  });

  // Health check del servicio de poesía
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      services: {
        analysis: 'active',
        generation: 'active',
        rhymeDatabase: 'loaded'
      },
      features: {
        syllableAnalysis: true,
        rhymeDetection: true,
        carnavalStyleAnalysis: true,
        poetryGeneration: true
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
};

// Función auxiliar para generar explicaciones en español
function buildSpanishExplanation(analysis) {
  let explanation = `📊 **Análisis Poético Completo**\n\n`;
  
  explanation += `🎭 **Estructura:**\n`;
  explanation += `• Versos: ${analysis.totalVerses}\n`;
  explanation += `• Métrica: ${analysis.metrics.pattern}\n`;
  explanation += `• Rima: ${analysis.rhyme.type} (${analysis.rhyme.scheme})\n`;
  explanation += `• Promedio silábico: ${analysis.metrics.statistics.averageSyllables}\n\n`;
  
  if (analysis.carnavalStyle) {
    explanation += `🎨 **Estilo Carnavalero:** ${analysis.carnavalStyle.level}\n`;
    explanation += `• Puntuación: ${(analysis.carnavalStyle.score * 100).toFixed(1)}%\n`;
    if (analysis.carnavalStyle.features.length > 0) {
      explanation += `• Características: ${analysis.carnavalStyle.features.join(', ')}\n`;
    }
    explanation += `\n`;
  }
  
  if (analysis.sentiment) {
    explanation += `💭 **Sentimiento:** ${analysis.sentiment.label}\n\n`;
  }
  
  if (analysis.metrics.pattern === 'Octosílabos') {
    explanation += `✨ **¡Perfecto para el Carnaval!** Los octosílabos son la base de las coplas carnavaleras.\n\n`;
  }
  
  explanation += `🔍 **Desglose por verso:**\n`;
  analysis.metrics.verses.forEach((verse, index) => {
    explanation += `${index + 1}. "${verse.text}" (${verse.syllables} sílabas)\n`;
  });

  if (analysis.improvements && analysis.improvements.length > 0) {
    explanation += `\n💡 **Sugerencias de mejora:**\n`;
    analysis.improvements.forEach(improvement => {
      explanation += `• ${improvement.description}\n`;
    });
  }

  return explanation;
}
