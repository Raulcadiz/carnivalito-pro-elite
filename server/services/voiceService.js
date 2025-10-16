const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class VoiceService {
  constructor(apiKeyManager, logger) {
    this.apiKeyManager = apiKeyManager;
    this.logger = logger;
    this.audioCache = new Map();
    this.voiceProfiles = this.initializeVoiceProfiles();
    this.defaultSettings = {
      language: 'es-ES',
      voice: 'es-ES-Standard-A',
      speed: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
      sampleRateHertz: 22050,
      audioEncoding: 'MP3'
    };
  }

  initializeVoiceProfiles() {
    return {
      carnivalito_default: {
        name: 'Carnivalito (Masculino)',
        voice: 'es-ES-Standard-B',
        pitch: -2.0,
        speed: 1.1,
        description: 'Voz masculina gaditana con personalidad'
      },
      carnivalito_female: {
        name: 'Carnivalita (Femenina)', 
        voice: 'es-ES-Standard-A',
        pitch: 1.5,
        speed: 1.0,
        description: 'Voz femenina con salero andaluz'
      },
      carnivalito_elder: {
        name: 'Abuelo Carnavalero',
        voice: 'es-ES-Standard-C',
        pitch: -4.0,
        speed: 0.9,
        description: 'Voz de veterano del carnaval'
      },
      carnivalito_young: {
        name: 'Joven Gaditano',
        voice: 'es-ES-Standard-D',
        pitch: 2.0,
        speed: 1.2,
        description: 'Voz juvenil y enérgica'
      }
    };
  }

  async synthesizeText(text, options = {}) {
    try {
      // Preprocesar texto para mejorar la pronunciación
      const processedText = this.preprocessTextForSpeech(text);
      
      // Aplicar configuración de voz
      const voiceSettings = this.buildVoiceSettings(options);
      
      // Generar hash para cache
      const cacheKey = this.generateCacheKey(processedText, voiceSettings);
      
      // Verificar cache
      if (this.audioCache.has(cacheKey)) {
        this.logger.info('Audio servido desde cache');
        return this.audioCache.get(cacheKey);
      }

      // Intentar síntesis con Google TTS
      let audioBuffer = await this.synthesizeWithGoogleTTS(processedText, voiceSettings);
      
      // Fallback a síntesis local si Google TTS no está disponible
      if (!audioBuffer) {
        audioBuffer = await this.synthesizeWithBrowserAPI(processedText, voiceSettings);
      }

      // Guardar en cache si el audio es válido
      if (audioBuffer && audioBuffer.length > 1000) {
        this.audioCache.set(cacheKey, audioBuffer);
        
        // Limpiar cache si es muy grande
        if (this.audioCache.size > 100) {
          const firstKey = this.audioCache.keys().next().value;
          this.audioCache.delete(firstKey);
        }
      }

      return audioBuffer;

    } catch (error) {
      this.logger.error('Error en síntesis de voz:', error);
      throw new Error('No se pudo generar el audio');
    }
  }

  preprocessTextForSpeech(text) {
    let processed = text;

    // Reemplazar emojis con descripciones
    const emojiReplacements = {
      '🎭': 'carnaval',
      '⚽': 'fútbol',
      '🎵': 'música',
      '💃': 'baile',
      '🎉': 'fiesta',
      '🌊': 'mar',
      '⚓': 'ancla',
      '🐟': 'pescao',
      '🚢': 'barco',
      '💛': 'amarillo',
      '💙': 'azul',
      '❤️': 'corazón'
    };

    for (const [emoji, replacement] of Object.entries(emojiReplacements)) {
      processed = processed.replaceAll(emoji, ` ${replacement} `);
    }

    // Mejorar pronunciación de expresiones gaditanas
    const gaditanPronunciation = {
      'pisha': 'pishá',
      'mostro': 'mostrón', 
      'zambombazo': 'zambombasó',
      'er': 'el',
      'pa': 'para',
      'na': 'nada',
      'toa': 'toda',
      'pescaítos': 'pescaditos',
      'gaditano': 'gaditáno',
      'Cádiz': 'Cádis',
      'COAC': 'co a ce'
    };

    for (const [original, pronunciation] of Object.entries(gaditanPronunciation)) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      processed = processed.replace(regex, pronunciation);
    }

    // Limpiar texto
    processed = processed
      .replace(/\s+/g, ' ') // Múltiples espacios
      .replace(/[^\w\sáéíóúüñ¿¡.,;:!?()-]/g, '') // Caracteres especiales
      .trim();

    return processed;
  }

  buildVoiceSettings(options = {}) {
    const profile = options.profile || 'carnivalito_default';
    const customSettings = this.voiceProfiles[profile] || this.voiceProfiles.carnivalito_default;

    return {
      ...this.defaultSettings,
      ...customSettings,
      ...options, // Las opciones específicas tienen prioridad
      text: undefined, // Remover text si viene en options
      profile: undefined // Remover profile
    };
  }

  async synthesizeWithGoogleTTS(text, settings) {
    try {
      const apiKey = this.apiKeyManager.getAPIKey('google_tts');
      if (!apiKey) {
        this.logger.warn('Google TTS API key no disponible');
        return null;
      }

      const requestBody = {
        input: { text },
        voice: {
          languageCode: settings.language,
          name: settings.voice,
          ssmlGender: this.getSSMLGender(settings.voice)
        },
        audioConfig: {
          audioEncoding: settings.audioEncoding,
          sampleRateHertz: settings.sampleRateHertz,
          speakingRate: settings.speed,
          pitch: settings.pitch,
          volumeGainDb: settings.volumeGainDb,
          effectsProfileId: ['telephony-class-application']
        }
      };

      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data && response.data.audioContent) {
        this.logger.info('Audio generado con Google TTS');
        return Buffer.from(response.data.audioContent, 'base64');
      }

      throw new Error('Respuesta inválida de Google TTS');

    } catch (error) {
      this.logger.warn(`Error con Google TTS: ${error.message}`);
      return null;
    }
  }

  getSSMLGender(voiceName) {
    if (voiceName.includes('Standard-A') || voiceName.includes('Standard-C')) {
      return 'FEMALE';
    }
    return 'MALE';
  }

  async synthesizeWithBrowserAPI(text, settings) {
    // Esta función simula lo que haría el navegador
    // En el frontend real se usaría Web Speech API
    this.logger.info('Fallback: Generando metadata para síntesis en navegador');
    
    return {
      type: 'browser_synthesis',
      text,
      settings,
      instruction: 'Usar Web Speech API en el cliente'
    };
  }

  generateCacheKey(text, settings) {
    const keyData = JSON.stringify({ text, settings });
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  async synthesizeCarnavalPoetry(verses, style = 'dramatic') {
    try {
      // Configuraciones especiales para poesía carnavalera
      const poetryStyles = {
        dramatic: {
          profile: 'carnivalito_elder',
          speed: 0.8,
          pitch: -1.0,
          pauseBetweenVerses: 1000
        },
        cheerful: {
          profile: 'carnivalito_young', 
          speed: 1.2,
          pitch: 1.0,
          pauseBetweenVerses: 500
        },
        romantic: {
          profile: 'carnivalito_female',
          speed: 0.9,
          pitch: 0.5,
          pauseBetweenVerses: 800
        }
      };

      const styleConfig = poetryStyles[style] || poetryStyles.dramatic;
      
      // Procesar versos con pausas apropiadas
      const processedText = verses
        .map(verse => verse.trim())
        .join(' ... ') // Pausas entre versos
        .replace(/\n/g, ' ... '); // Pausas en saltos de línea

      return await this.synthesizeText(processedText, styleConfig);

    } catch (error) {
      this.logger.error('Error sintetizando poesía:', error);
      throw error;
    }
  }

  async generateVoiceVariations(text, variations = 3) {
    const profiles = Object.keys(this.voiceProfiles);
    const results = [];

    for (let i = 0; i < Math.min(variations, profiles.length); i++) {
      try {
        const profile = profiles[i];
        const audio = await this.synthesizeText(text, { profile });
        
        results.push({
          profile,
          profileName: this.voiceProfiles[profile].name,
          audio,
          description: this.voiceProfiles[profile].description
        });
      } catch (error) {
        this.logger.warn(`Error generando variación con perfil ${profiles[i]}:`, error);
      }
    }

    return results;
  }

  async saveAudioFile(audioBuffer, filename) {
    try {
      const audioDir = path.join(__dirname, '../../public/audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const filepath = path.join(audioDir, filename);
      
      if (audioBuffer.type === 'browser_synthesis') {
        // Guardar metadata para síntesis en navegador
        fs.writeFileSync(filepath + '.json', JSON.stringify(audioBuffer, null, 2));
        return filepath + '.json';
      } else {
        // Guardar audio binario
        fs.writeFileSync(filepath, audioBuffer);
        return filepath;
      }
      
    } catch (error) {
      this.logger.error('Error guardando archivo de audio:', error);
      throw error;
    }
  }

  getAvailableVoices() {
    return Object.entries(this.voiceProfiles).map(([key, profile]) => ({
      id: key,
      name: profile.name,
      description: profile.description,
      voice: profile.voice,
      isDefault: key === 'carnivalito_default'
    }));
  }

  validateAudioSettings(settings) {
    const errors = [];

    if (settings.speed && (settings.speed < 0.25 || settings.speed > 4.0)) {
      errors.push('La velocidad debe estar entre 0.25 y 4.0');
    }

    if (settings.pitch && (settings.pitch < -20.0 || settings.pitch > 20.0)) {
      errors.push('El tono debe estar entre -20.0 y 20.0');
    }

    if (settings.volumeGainDb && (settings.volumeGainDb < -96.0 || settings.volumeGainDb > 16.0)) {
      errors.push('El volumen debe estar entre -96.0 y 16.0 dB');
    }

    return errors;
  }

  clearCache() {
    this.audioCache.clear();
    this.logger.info('Cache de audio limpiado');
  }

  getCacheStats() {
    return {
      size: this.audioCache.size,
      maxSize: 100,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }

  isAvailable() {
    const googleTTSKey = this.apiKeyManager.getAPIKey('google_tts');
    return googleTTSKey !== null || typeof window !== 'undefined';
  }

  // Método para analizar calidad del audio generado
  analyzeAudioQuality(audioBuffer) {
    if (!audioBuffer || audioBuffer.type === 'browser_synthesis') {
      return { quality: 'unknown', size: 0 };
    }

    const size = audioBuffer.length;
    let quality = 'low';

    if (size > 10000) quality = 'medium';
    if (size > 50000) quality = 'high';
    if (size > 100000) quality = 'excellent';

    return {
      quality,
      size,
      estimatedDuration: Math.round(size / 2000), // Estimación burda
      bitrate: 'variable'
    };
  }
}

module.exports = VoiceService;
