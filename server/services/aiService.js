const axios = require('axios');
const natural = require('natural');
const crypto = require('crypto');

class AIService {
  constructor(apiKeyManager, logger) {
    this.apiKeyManager = apiKeyManager;
    this.logger = logger;
    this.conversationMemory = new Map(); // Memoria por usuario
    this.responsePatterns = this.initializeResponsePatterns();
    this.carnavalKnowledge = this.loadCarnavalKnowledge();
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('Spanish', 
      natural.PorterStemmerEs, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
  }

  initializeResponsePatterns() {
    return {
      carnaval: {
        triggers: ['carnaval', 'chirigota', 'comparsa', 'coro', 'cuarteto', 'coac', 'falla', 'copla'],
        responses: [
          "¡Olé tus cojones! Eso del Carnaval tiene más arte que una copla de {autor}. 🎭",
          "En el COAC eso lo cantaría una chirigota de las buenas, pisha. ¡Qué salero! 🎵",
          "¡Zambombazo! Eso es pura esencia carnavalera gaditana. Como las mejores del Falla. 💃"
        ],
        follow_ups: [
          "¿Te gustaría que te analice alguna copla o que escriba una nueva?",
          "¿Conoces la historia de alguna agrupación famosa?",
          "¿Quieres que hablemos de las modalidades del COAC?"
        ]
      },
      cadiz: {
        triggers: ['cadiz', 'cádiz', 'gaditano', 'tacita', 'caleta', 'barrio'],
        responses: [
          "¡Eso es más gaditano que los pescaítos fritos en La Caleta, mostro! 🐟",
          "Como buen hijo de la tacita de plata, tienes razón de la buena. ⚓",
          "¡Viva Cádiz y viva la sal de esta tierra bendita! Eso tiene salero. 🌊"
        ],
        follow_ups: [
          "¿Has estado alguna vez en La Caleta al atardecer?",
          "¿Conoces la historia de las torres vigía de Cádiz?",
          "¿Te gusta el pescaíto frito de verdad?"
        ]
      },
      futbol: {
        triggers: ['futbol', 'fútbol', 'cadiz cf', 'cádiz cf', 'mirandilla', 'carranza'],
        responses: [
          "¡Viva er Cádiz CF! Amarillo submarino hasta la muerte, pisha. ⚽",
          "Como cadista de pura cepa, el corazón se me pone amarillo. 💛💙",
          "¡El submarino amarillo navega en Primera! Qué orgullo gaditano. 🚢"
        ],
        follow_ups: [
          "¿Has ido alguna vez al Nuevo Mirandilla?",
          "¿Recuerdas el ascenso histórico a Primera?",
          "¿Cuál ha sido tu momento favorito del Cádiz?"
        ]
      },
      poesia: {
        triggers: ['verso', 'rima', 'métrica', 'sílaba', 'poema', 'poesía', 'letra'],
        responses: [
          "La poesía gaditana tiene un duende especial, como las alegrías. 📝",
          "Los versos octosílabos son el alma del Carnaval, pisha. ✍️",
          "En Cádiz hasta hablamos en coplas, mostro. Es nuestro arte. 🎨"
        ],
        follow_ups: [
          "¿Quieres que analice la métrica de algún verso?",
          "¿Te gustaría aprender sobre la estructura de las coplas?",
          "¿Escribimos juntos una copla carnavalera?"
        ]
      }
    };
  }

  loadCarnavalKnowledge() {
    return {
      modalidades: {
        chirigota: {
          caracteristicas: "Humor, crítica social, disfraz llamativo",
          estructura: "Presentación, pasodobles, cuplés, popurrí",
          duracion: "45 minutos",
          integrantes: "Entre 7 y 12"
        },
        comparsa: {
          caracteristicas: "Lírica, drama, música elaborada",
          estructura: "Presentación, pasodobles, cuplés",
          duracion: "45 minutos", 
          integrantes: "Entre 7 y 15"
        },
        coro: {
          caracteristicas: "Voces, armonía, tradición",
          estructura: "Presentación, pasodobles, cuplés",
          duracion: "45 minutos",
          integrantes: "Entre 16 y 45"
        },
        cuarteto: {
          caracteristicas: "Intimidad, humor fino, diálogo",
          estructura: "Presentación, cuplés",
          duracion: "25 minutos",
          integrantes: "4 personas"
        }
      },
      autores_famosos: [
        "Antonio Martín", "El Yuyu", "Manolo Santander", "Los Millonarios",
        "La Banda Trapera del Río", "Los Compadres", "Selu", "El Canijo de Jerez"
      ],
      frases_tipicas: [
        "¡Viva er Carnaval!", "¡Qué arte tienes!", "¡Olé tus cojones!",
        "¡Zambombazo!", "¡Qué salero!", "Eso tiene más miga que...",
        "¡Viva la tacita de plata!", "¡Pisha!", "¡Mostro!"
      ]
    };
  }

  async processMessage(message, userId, context = {}) {
    const startTime = Date.now();
    
    try {
      // Actualizar memoria del usuario
      this.updateUserMemory(userId, message, context);
      
      // Análisis del mensaje
      const analysis = this.analyzeMessage(message);
      
      // Generar respuesta contextual
      const response = await this.generateContextualResponse(message, userId, analysis);
      
      // Calcular métricas
      const responseTime = Date.now() - startTime;
      const qualityScore = this.calculateResponseQuality(message, response, analysis);
      
      return {
        response,
        analysis,
        metadata: {
          responseTime,
          qualityScore,
          aiModel: this.getUsedModel(),
          contextUsed: this.getUserContext(userId).length > 0
        }
      };
      
    } catch (error) {
      this.logger.error('Error procesando mensaje:', error);
      return {
        response: this.getFallbackResponse(message),
        analysis: { sentiment: 'neutral', topic: 'general' },
        metadata: {
          responseTime: Date.now() - startTime,
          qualityScore: 0.5,
          aiModel: 'fallback',
          error: true
        }
      };
    }
  }

  analyzeMessage(message) {
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    
    // Análisis de sentimiento
    const sentiment = this.analyzeSentiment(tokens);
    
    // Clasificación de tema
    const topic = this.classifyTopic(message);
    
    // Detección de intenciones
    const intent = this.detectIntent(message);
    
    // Análisis de complejidad
    const complexity = this.analyzeComplexity(message);
    
    return {
      sentiment,
      topic,
      intent,
      complexity,
      tokens: tokens.length,
      entities: this.extractEntities(message)
    };
  }

  analyzeSentiment(tokens) {
    try {
      const score = this.sentimentAnalyzer.getSentiment(tokens);
      
      if (score > 0.2) return { label: 'positive', score };
      if (score < -0.2) return { label: 'negative', score };
      return { label: 'neutral', score };
    } catch (error) {
      return { label: 'neutral', score: 0 };
    }
  }

  classifyTopic(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [topic, data] of Object.entries(this.responsePatterns)) {
      if (data.triggers.some(trigger => lowerMessage.includes(trigger))) {
        return {
          category: topic,
          confidence: this.calculateTopicConfidence(lowerMessage, data.triggers)
        };
      }
    }
    
    return { category: 'general', confidence: 0.3 };
  }

  calculateTopicConfidence(message, triggers) {
    const matches = triggers.filter(trigger => message.includes(trigger));
    return Math.min(matches.length / triggers.length + 0.3, 1.0);
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    const intents = {
      question: ['qué', 'cómo', 'cuándo', 'dónde', 'por qué', 'quién', '?'],
      request: ['puedes', 'podrías', 'ayuda', 'quiero', 'necesito'],
      greeting: ['hola', 'buenas', 'saludos', 'hey', 'qué tal'],
      farewell: ['adiós', 'hasta luego', 'bye', 'chao', 'nos vemos'],
      compliment: ['gracias', 'genial', 'perfecto', 'excelente', 'bueno'],
      creative: ['escribe', 'crea', 'compón', 'inventa', 'genera']
    };
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent;
      }
    }
    
    return 'statement';
  }

  analyzeComplexity(message) {
    const words = message.split(/\s+/).length;
    const sentences = message.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (words > 50 || avgWordsPerSentence > 15) return 'high';
    if (words > 20 || avgWordsPerSentence > 8) return 'medium';
    return 'low';
  }

  extractEntities(message) {
    const entities = [];
    
    // Nombres de agrupaciones conocidas
    const agrupaciones = ['millonarios', 'antifaces', 'supremacía', 'los carapapa'];
    agrupaciones.forEach(agrupacion => {
      if (message.toLowerCase().includes(agrupacion)) {
        entities.push({ type: 'agrupacion', value: agrupacion });
      }
    });
    
    // Años (para referencias históricas)
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const years = message.match(yearRegex);
    if (years) {
      years.forEach(year => {
        entities.push({ type: 'year', value: year });
      });
    }
    
    return entities;
  }

  async generateContextualResponse(message, userId, analysis) {
    // Intentar con APIs externas primero
    try {
      const externalResponse = await this.tryExternalAPIs(message, userId, analysis);
      if (externalResponse) {
        return this.enhanceResponse(externalResponse, analysis);
      }
    } catch (error) {
      this.logger.warn('APIs externas no disponibles, usando respuestas locales');
    }
    
    // Generar respuesta local inteligente
    return this.generateLocalResponse(message, userId, analysis);
  }

  async tryExternalAPIs(message, userId, analysis) {
    const context = this.getUserContext(userId);
    const systemPrompt = this.buildSystemPrompt(analysis);
    
    // Intentar con Groq
    try {
      const groqKey = this.apiKeyManager.getAPIKey('groq');
      if (groqKey) {
        return await this.callGroqAPI(message, context, systemPrompt, groqKey);
      }
    } catch (error) {
      this.logger.warn('Error con Groq API:', error.message);
    }
    
    // Intentar con HuggingFace
    try {
      const hfKey = this.apiKeyManager.getAPIKey('huggingface');
      if (hfKey) {
        return await this.callHuggingFaceAPI(message, context, hfKey);
      }
    } catch (error) {
      this.logger.warn('Error con HuggingFace API:', error.message);
    }
    
    return null;
  }

  buildSystemPrompt(analysis) {
    let prompt = `Eres Carnivalito Pro Elite, el mejor asistente experto en Carnaval de Cádiz y Cádiz CF.
    
Características importantes:
- Hablas con auténtico salero gaditano
- Usas expresiones como "pisha", "mostro", "zambombazo", "olé tus cojones"
- Eres experto en COAC, chirigotas, comparsas, coros y cuartetos
- Conoces la historia del Cádiz CF y la ciudad
- Eres ingenioso, divertido pero también informativo
- Puedes analizar métrica poética y crear coplas

`;

    if (analysis.topic.category !== 'general') {
      prompt += `El usuario está preguntando sobre: ${analysis.topic.category}
`;
    }

    if (analysis.sentiment.label !== 'neutral') {
      prompt += `El tono del mensaje es: ${analysis.sentiment.label}
`;
    }

    prompt += `
Responde siempre en español, con personalidad gaditana auténtica.
No uses más de 150 palabras por respuesta.
Si es apropiado, termina con una pregunta para continuar la conversación.`;

    return prompt;
  }

  async callGroqAPI(message, context, systemPrompt, apiKey) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Añadir contexto reciente
    context.slice(-3).forEach(item => {
      messages.push({ role: 'user', content: item.message });
      if (item.response) {
        messages.push({ role: 'assistant', content: item.response });
      }
    });
    
    messages.push({ role: 'user', content: message });

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      messages,
      model: 'llama3-70b-8192',
      max_tokens: 400,
      temperature: 0.8,
      presence_penalty: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data.choices[0].message.content;
  }

  async callHuggingFaceAPI(message, context, apiKey) {
    const prompt = this.buildHFPrompt(message, context);
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      { 
        inputs: prompt,
        parameters: {
          max_length: 200,
          temperature: 0.8,
          repetition_penalty: 1.1
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data[0]?.generated_text?.replace(prompt, '').trim();
  }

  buildHFPrompt(message, context) {
    let prompt = "Conversación con Carnivalito, experto en Carnaval de Cádiz:\n\n";
    
    context.slice(-2).forEach(item => {
      prompt += `Usuario: ${item.message}\n`;
      if (item.response) {
        prompt += `Carnivalito: ${item.response}\n`;
      }
    });
    
    prompt += `Usuario: ${message}\nCarnivalito:`;
    return prompt;
  }

  generateLocalResponse(message, userId, analysis) {
    const context = this.getUserContext(userId);
    const topic = analysis.topic.category;
    
    // Seleccionar patrón de respuesta basado en el tema
    if (this.responsePatterns[topic]) {
      const pattern = this.responsePatterns[topic];
      let response = this.selectRandomResponse(pattern.responses);
      
      // Personalizar respuesta
      response = this.personalizeResponse(response, analysis);
      
      // Añadir seguimiento contextual
      if (Math.random() > 0.3 && pattern.follow_ups) {
        const followUp = this.selectRandomResponse(pattern.follow_ups);
        response += `\n\n${followUp}`;
      }
      
      return response;
    }
    
    // Respuesta general inteligente
    return this.generateGeneralResponse(message, analysis);
  }

  selectRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  personalizeResponse(response, analysis) {
    // Reemplazar placeholders
    const replacements = {
      '{autor}': this.selectRandomResponse(this.carnavalKnowledge.autores_famosos),
      '{modalidad}': this.selectRandomResponse(Object.keys(this.carnavalKnowledge.modalidades))
    };
    
    let personalizedResponse = response;
    for (const [placeholder, value] of Object.entries(replacements)) {
      personalizedResponse = personalizedResponse.replace(placeholder, value);
    }
    
    return personalizedResponse;
  }

  generateGeneralResponse(message, analysis) {
    const sentiment = analysis.sentiment.label;
    const intent = analysis.intent;
    
    if (intent === 'greeting') {
      return "¡Ey, pisha! ¡Qué tal tú! Aquí Carnivalito, listo para hablar de Carnaval, Cádiz o lo que se te ocurra. ¡Dale, mostro!";
    }
    
    if (intent === 'farewell') {
      return "¡Hasta luego, compañero! Que viva er Carnaval y que viva Cádiz. ¡Vuelve cuando quieras! 🎭";
    }
    
    if (sentiment === 'positive') {
      return "¡Zambombazo! Me alegra leerte tan contento, pisha. Eso es puro salero gaditano. ¿En qué más puedo ayudarte?";
    }
    
    if (sentiment === 'negative') {
      return "Tranquilo, mostro. En Cádiz sabemos que después de la tempestad viene la calma. ¿Quieres que hablemos de algo que te anime?";
    }
    
    // Respuesta neutral por defecto
    const generalResponses = [
      "¡Qué bueno, mostro! Me has sacado una sonrisa carnavalera. ¿De qué más hablamos?",
      "Eso se merece un aplauso en el Falla, pisha. ¡Olé! ¿Algo más?",
      "¡Zambombazo! Lo que dices tiene mucho salero gaditano. ¿Continuamos?"
    ];
    
    return this.selectRandomResponse(generalResponses);
  }

  enhanceResponse(response, analysis) {
    // Añadir emojis contextualmente
    if (analysis.topic.category === 'carnaval') {
      response = response.replace(/carnaval/gi, 'Carnaval 🎭');
    }
    
    if (analysis.topic.category === 'futbol') {
      response = response.replace(/cádiz cf/gi, 'Cádiz CF ⚽');
    }
    
    return response;
  }

  updateUserMemory(userId, message, context) {
    if (!this.conversationMemory.has(userId)) {
      this.conversationMemory.set(userId, []);
    }
    
    const userMemory = this.conversationMemory.get(userId);
    userMemory.push({
      message,
      timestamp: Date.now(),
      context
    });
    
    // Mantener solo los últimos 20 mensajes
    if (userMemory.length > 20) {
      userMemory.splice(0, userMemory.length - 20);
    }
  }

  getUserContext(userId) {
    return this.conversationMemory.get(userId) || [];
  }

  calculateResponseQuality(message, response, analysis) {
    let score = 0.5; // Base score
    
    // Bonus por longitud apropiada
    if (response.length > 20 && response.length < 300) score += 0.1;
    
    // Bonus por personalización
    if (response.includes('pisha') || response.includes('mostro')) score += 0.1;
    
    // Bonus por relevancia al tema
    if (analysis.topic.confidence > 0.7) score += 0.2;
    
    // Bonus por seguimiento conversacional
    if (response.includes('?')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  getFallbackResponse(message) {
    const fallbacks = [
      "¡Ay, pisha! Algo ha fallado en el tangai. Pero aquí sigo, ¿de qué hablamos?",
      "¡Zambombazo! Se me ha trabado la lengua. ¿Me lo puedes repetir, mostro?",
      "¡Viva er Carnaval! Aunque ahora mismo no te he entendido del todo. ¿Otra vez?"
    ];
    
    return this.selectRandomResponse(fallbacks);
  }

  getUsedModel() {
    const groqKey = this.apiKeyManager.getAPIKey('groq');
    const hfKey = this.apiKeyManager.getAPIKey('huggingface');
    
    if (groqKey) return 'groq-llama3-70b';
    if (hfKey) return 'huggingface-dialogpt';
    return 'local-patterns';
  }

  // Método para el sistema de aprendizaje
  learnFromFeedback(message, response, rating, feedback) {
    // Implementar lógica de aprendizaje basada en feedback
    const learningData = {
      message,
      response,
      rating,
      feedback,
      timestamp: Date.now()
    };
    
    // Esto se conectará con el LearningService
    this.logger.info('Feedback recibido para aprendizaje:', learningData);
  }
}

module.exports = AIService;
