const express = require('express');
const router = express.Router();
const Joi = require('joi');
const multer = require('multer');
const path = require('path');

module.exports = (voiceService) => {
  
  // Configuración de multer para subida de archivos de audio
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido'), false);
      }
    }
  });

  // Esquemas de validación
  const synthesizeSchema = Joi.object({
    text: Joi.string().min(1).max(2000).required(),
    options: Joi.object({
      profile: Joi.string().valid(
        'carnivalito_default', 'carnivalito_female', 
        'carnivalito_elder', 'carnivalito_young'
      ).optional(),
      speed: Joi.number().min(0.25).max(4.0).optional(),
      pitch: Joi.number().min(-20.0).max(20.0).optional(),
      volumeGainDb: Joi.number().min(-96.0).max(16.0).optional(),
      voice: Joi.string().optional(),
      language: Joi.string().optional()
    }).optional()
  });

  const poetrySchema = Joi.object({
    verses: Joi.array().items(Joi.string().min(1).max(200)).min(1).max(20).required(),
    style: Joi.string().valid('dramatic', 'cheerful', 'romantic').optional()
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

  // Endpoint principal de síntesis de voz
  router.post('/synthesize', validateRequest(synthesizeSchema), async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { text, options = {} } = req.body;

      // Validar configuraciones de audio
      const validationErrors = voiceService.validateAudioSettings(options);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Configuración de audio inválida',
          details: validationErrors
        });
      }

      // Sintetizar audio
      const audioBuffer = await voiceService.synthesizeText(text, options);
      
      if (!audioBuffer) {
        throw new Error('No se pudo generar el audio');
      }

      // Analizar calidad del audio
      const qualityAnalysis = voiceService.analyzeAudioQuality(audioBuffer);

      const processingTime = Date.now() - startTime;

      // Si es síntesis de navegador, devolver instrucciones
      if (audioBuffer.type === 'browser_synthesis') {
        return res.json({
          success: true,
          type: 'browser_synthesis',
          instructions: audioBuffer,
          metadata: {
            processingTime,
            fallbackUsed: true,
            message: 'Usar Web Speech API en el cliente'
          }
        });
      }

      // Establecer headers apropiados para audio
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=3600',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Audio-Quality': qualityAnalysis.quality,
        'X-Estimated-Duration': `${qualityAnalysis.estimatedDuration}s`
      });

      // Devolver audio como stream
      res.send(audioBuffer);

    } catch (error) {
      console.error('Error en síntesis de voz:', error);
      
      res.status(500).json({
        error: 'Error generando audio',
        message: error.message,
        processingTime: Date.now() - startTime,
        fallback: {
          type: 'browser_synthesis',
          text: req.body.text,
          message: 'Intenta usar la síntesis de voz del navegador'
        }
      });
    }
  });

  // Endpoint para síntesis de poesía carnavalera
  router.post('/poetry', validateRequest(poetrySchema), async (req, res) => {
    try {
      const { verses, style = 'dramatic' } = req.body;

      const audioBuffer = await voiceService.synthesizeCarnavalPoetry(verses, style);
      const qualityAnalysis = voiceService.analyzeAudioQuality(audioBuffer);

      if (audioBuffer.type === 'browser_synthesis') {
        return res.json({
          success: true,
          type: 'browser_synthesis',
          instructions: audioBuffer,
          style,
          metadata: {
            versesCount: verses.length,
            style,
            fallbackUsed: true
          }
        });
      }

      res.set({
        'Content-Type': 'audio/mpeg',
        'X-Poetry-Style': style,
        'X-Verses-Count': verses.length.toString(),
        'X-Audio-Quality': qualityAnalysis.quality
      });

      res.send(audioBuffer);

    } catch (error) {
      console.error('Error en síntesis de poesía:', error);
      res.status(500).json({
        error: 'Error generando audio de poesía',
        message: error.message
      });
    }
  });

  // Endpoint para obtener variaciones de voz
  router.post('/variations', async (req, res) => {
    try {
      const { text, variations = 3 } = req.body;

      if (!text || typeof text !== 'string' || text.length > 500) {
        return res.status(400).json({
          error: 'Texto inválido. Máximo 500 caracteres.'
        });
      }

      const variationResults = await voiceService.generateVoiceVariations(
        text, 
        Math.min(variations, 4) // Máximo 4 variaciones
      );

      const response = {
        success: true,
        text,
        variations: variationResults.map((variation, index) => ({
          id: index,
          profile: variation.profile,
          name: variation.profileName,
          description: variation.description,
          hasAudio: !!variation.audio && variation.audio.type !== 'browser_synthesis'
        })),
        metadata: {
          totalVariations: variationResults.length,
          requestedVariations: variations
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error generando variaciones:', error);
      res.status(500).json({
        error: 'Error generando variaciones de voz'
      });
    }
  });

  // Endpoint para descargar variación específica
  router.get('/variations/:variationId/download', async (req, res) => {
    try {
      const { variationId } = req.params;
      const { text } = req.query;

      if (!text) {
        return res.status(400).json({
          error: 'Parámetro text requerido'
        });
      }

      const profiles = Object.keys(voiceService.voiceProfiles);
      const profileIndex = parseInt(variationId);

      if (profileIndex < 0 || profileIndex >= profiles.length) {
        return res.status(404).json({
          error: 'Variación no encontrada'
        });
      }

      const profile = profiles[profileIndex];
      const audioBuffer = await voiceService.synthesizeText(text, { profile });

      if (audioBuffer.type === 'browser_synthesis') {
        return res.json({
          error: 'Audio no disponible para descarga',
          instructions: audioBuffer
        });
      }

      const profileData = voiceService.voiceProfiles[profile];
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="carnivalito_${profile}.mp3"`,
        'X-Voice-Profile': profileData.name
      });

      res.send(audioBuffer);

    } catch (error) {
      console.error('Error descargando variación:', error);
      res.status(500).json({
        error: 'Error descargando audio'
      });
    }
  });

  // Endpoint para obtener perfiles de voz disponibles
  router.get('/profiles', (req, res) => {
    try {
      const profiles = voiceService.getAvailableVoices();
      
      res.json({
        success: true,
        profiles,
        metadata: {
          totalProfiles: profiles.length,
          googleTTSAvailable: !!voiceService.apiKeyManager.getAPIKey('google_tts'),
          browserFallbackAvailable: true
        }
      });

    } catch (error) {
      console.error('Error obteniendo perfiles:', error);
      res.status(500).json({
        error: 'Error obteniendo perfiles de voz'
      });
    }
  });

  // Endpoint para probar configuración de voz
  router.post('/test', async (req, res) => {
    try {
      const testText = "¡Hola, pisha! Soy Carnivalito y esto es una prueba de voz gaditana.";
      const { options = {} } = req.body;

      // Validar configuraciones
      const validationErrors = voiceService.validateAudioSettings(options);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Configuración inválida',
          details: validationErrors
        });
      }

      const audioBuffer = await voiceService.synthesizeText(testText, options);
      const qualityAnalysis = voiceService.analyzeAudioQuality(audioBuffer);

      if (audioBuffer.type === 'browser_synthesis') {
        return res.json({
          success: true,
          type: 'browser_synthesis',
          instructions: audioBuffer,
          testText,
          quality: qualityAnalysis
        });
      }

      res.set({
        'Content-Type': 'audio/mpeg',
        'X-Test-Audio': 'true',
        'X-Audio-Quality': qualityAnalysis.quality
      });

      res.send(audioBuffer);

    } catch (error) {
      console.error('Error en prueba de voz:', error);
      res.status(500).json({
        error: 'Error en prueba de voz',
        message: error.message
      });
    }
  });

  // Endpoint para limpiar cache de audio
  router.delete('/cache', (req, res) => {
    try {
      voiceService.clearCache();
      
      res.json({
        success: true,
        message: 'Cache de audio limpiado correctamente'
      });

    } catch (error) {
      console.error('Error limpiando cache:', error);
      res.status(500).json({
        error: 'Error limpiando cache de audio'
      });
    }
  });

  // Endpoint para estadísticas del servicio de voz
  router.get('/stats', (req, res) => {
    try {
      const cacheStats = voiceService.getCacheStats();
      
      res.json({
        success: true,
        stats: {
          serviceAvailable: voiceService.isAvailable(),
          cache: cacheStats,
          profiles: {
            total: Object.keys(voiceService.voiceProfiles).length,
            available: voiceService.getAvailableVoices().length
          },
          apis: {
            googleTTS: !!voiceService.apiKeyManager.getAPIKey('google_tts'),
            browserFallback: true
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de voz:', error);
      res.status(500).json({
        error: 'Error obteniendo estadísticas'
      });
    }
  });

  // Health check del servicio de voz
  router.get('/health', (req, res) => {
    try {
      const isHealthy = voiceService.isAvailable();
      const googleTTSAvailable = !!voiceService.apiKeyManager.getAPIKey('google_tts');

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        services: {
          googleTTS: googleTTSAvailable ? 'available' : 'unavailable',
          browserFallback: 'available',
          cache: 'active'
        },
        message: isHealthy 
          ? 'Servicio de voz funcionando correctamente'
          : 'Servicio de voz en modo degradado (solo fallback)',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en health check de voz:', error);
      res.status(500).json({
        status: 'error',
        error: 'Error verificando estado del servicio'
      });
    }
  });

  return router;
};
