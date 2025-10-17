const express = require('express');
const axios = require('axios');
const router = express.Router();

// Función para obtener configuración de APIs desde la base de datos
async function getAPIConfig() {
  const { cache, db } = require('../app_enhanced');
  
  const cached = cache.get('api_config');
  if (cached) return cached;
  
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM system_config WHERE key LIKE "%api_key"', (err, rows) => {
      if (err) return reject(err);
      
      const config = {};
      rows.forEach(row => {
        config[row.key] = row.value;
      });
      
      // Fallback a variables de entorno
      if (!config.groq_api_key) config.groq_api_key = process.env.GROQ_API_KEY;
      if (!config.hf_api_key) config.hf_api_key = process.env.HF_API_KEY;
      
      cache.set('api_config', config, 300);
      resolve(config);
    });
  });
}

// Análisis de sentimiento básico
function analyzeSentiment(text) {
  const positiveWords = ['alegr', 'fiest', 'carnaval', 'olé', 'viva', 'guasa', 'risa', 'baile', 'amor', 'feliz'];
  const negativeWords = ['triste', 'llor', 'pena', 'adiós', 'desped', 'mal', 'problema', 'dolor', 'sufr'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount + 1) return 'positive';
  if (negativeCount > positiveCount + 1) return 'negative';
  return 'neutral';
}

// Detectar temas en el texto
function detectTopic(text) {
  const topics = {
    carnaval: ['carnaval', 'chirigota', 'comparsa', 'coro', 'cuarteto', 'copla', 'coac', 'falla'],
    cadiz: ['cadiz', 'cádiz', 'gaditano', 'tacita', 'caleta', 'barrio'],
    futbol: ['futbol', 'fútbol', 'cadiz cf', 'cádiz cf', 'mirandilla', 'carranza'],
    poesia: ['verso', 'rima', 'métrica', 'sílaba', 'poema', 'poesía'],
    musica: ['música', 'cantar', 'melodía', 'ritmo', 'compás']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return topic;
    }
  }
  
  return 'general';
}

// ==================== RUTAS PRINCIPALES ====================

// Chat principal con contexto inteligente
router.post('/chat', async (req, res) => {
  const { message, userId, sessionId } = req.body;
  const { db } = require('../app_enhanced');
  
  if (!message || !userId) {
    return res.status(400).json({ error: 'Mensaje y userId requeridos' });
  }

  const sentiment = analyzeSentiment(message);
  const topic = detectTopic(message);
  const ipAddress = req.ip;

  try {
    // Obtener contexto de conversaciones recientes del usuario
    const recentContext = await new Promise((resolve, reject) => {
      db.all(`
        SELECT message, response 
        FROM conversations 
        WHERE userId = ? 
        ORDER BY timestamp DESC 
        LIMIT 5
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Construir prompt contextual
    let contextPrompt = '';
    if (recentContext.length > 0) {
      contextPrompt = '\n\nContexto de conversación previa:\n' + 
        recentContext.reverse().map(row => 
          `Usuario: ${row.message}\nAsistente: ${row.response}`
        ).join('\n') + '\n\n';
    }

    const systemPrompt = `Eres Carnivalito Pro Elite, el mejor asistente experto en Carnaval de Cádiz y Cádiz CF. 
    Responde con auténtico salero gaditano, usando expresiones como "pisha", "mostro", "zambombazo".
    Integra referencias al carnaval, COAC, chirigotas, comparsas, y al Cádiz CF cuando sea relevante.
    Sé ingenioso, divertido, pero también informativo y útil.
    
    Contexto detectado: Tema=${topic}, Sentimiento=${sentiment}`;

    const fullPrompt = systemPrompt + contextPrompt + `\nUsuario: ${message}\nAsistente:`;

    let response;

    try {
      // Intentar con Groq primero
      const config = await getAPIConfig();
      
      if (config.groq_api_key) {
        const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contextPrompt + message }
          ],
          model: 'llama3-70b-8192',
          max_tokens: 600,
          temperature: 0.8
        }, {
          headers: {
            'Authorization': `Bearer ${config.groq_api_key}`,
            'Content-Type': 'application/json'
          }
        });

        response = groqResponse.data.choices[0].message.content;
      } else {
        throw new Error('No Groq API key available');
      }

    } catch (groqError) {
      console.log('Groq falló, intentando con HuggingFace:', groqError.message);
      
      try {
        const config = await getAPIConfig();
        
        if (config.hf_api_key) {
          const hfResponse = await axios.post(
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
            { inputs: fullPrompt },
            { 
              headers: { 
                'Authorization': `Bearer ${config.hf_api_key}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          response = hfResponse.data[0]?.generated_text?.replace(fullPrompt, '').trim() || 
                     '¡Viva el Carnaval, pisha! 🎭';
        } else {
          throw new Error('No HF API key available');
        }
        
      } catch (hfError) {
        console.log('HuggingFace también falló, usando respuesta local');
        
        // Respuestas inteligentes locales basadas en el tema detectado
        const localResponses = {
          carnaval: [
            "¡Olé tus cojones! Eso que dices del Carnaval tiene más miga que una copla de Los Millonarios. 🎭",
            "En el COAC eso lo cantaría una chirigota de las buenas, pisha. ¡Qué arte tienes! 🎵",
            "¡Zambombazo! Eso es pura esencia carnavalera gaditana. Como las coplas del Falla. 💃"
          ],
          cadiz: [
            "¡Eso es más gaditano que los pescaítos fritos en La Caleta, mostro! 🐟",
            "Como buen hijo de la tacita de plata, te digo que tienes razón. ⚓",
            "¡Viva Cádiz y viva la sal de esta tierra! Eso que dices tiene salero. 🌊"
          ],
          futbol: [
            "¡Viva er Cádiz CF! Eso lo dirían en las gradas del Nuevo Mirandilla. ⚽",
            "Como cadista de pura cepa, te digo que tienes razón, pisha. 💛💙",
            "¡Amarillo submarino! El Cádiz en Primera es un sueño hecho realidad. 🚢"
          ],
          general: [
            "¡Qué bueno, mostro! Me has sacado una sonrisa carnavalera. 😄",
            "Eso se merece un aplauso en el Falla, pisha. ¡Olé! 👏",
            "¡Zambombazo! Lo que dices tiene mucho salero gaditano. 🎉"
          ]
        };
        
        const responses = localResponses[topic] || localResponses.general;
        response = responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Guardar conversación en base de datos
    db.run(`
      INSERT INTO conversations (userId, message, response, ip_address, session_id, sentiment, topic)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, message, response, ipAddress, sessionId, sentiment, topic]);

    // Actualizar estadísticas del usuario
    db.run(`
      UPDATE users 
      SET last_active = CURRENT_TIMESTAMP, 
          total_messages = total_messages + 1 
      WHERE userId = ?
    `, [userId]);

    res.json({ 
      reply: response,
      metadata: {
        sentiment,
        topic,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({ 
      error: '¡Ay, pisha! Algo ha fallado en el tangai. Inténtalo de nuevo.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Análisis poético avanzado
router.post('/analyze-poem', async (req, res) => {
  const { text, userId } = req.body;
  const { db } = require('../app_enhanced');
  
  if (!text) {
    return res.status(400).json({ error: 'Texto requerido para análisis' });
  }

  try {
    // Análisis de métrica
    function analyzeMetrics(text) {
      const verses = text.split('\n').filter(v => v.trim());
      
      const analysis = verses.map(verse => {
        const cleanVerse = verse.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[.,;:!?¿¡()"\[\]]/g, '')
          .trim();
        
        // Contador de sílabas más preciso
        let syllables = 0;
        let inVowel = false;
        
        for (let i = 0; i < cleanVerse.length; i++) {
          const char = cleanVerse[i];
          if ('aeiouáéíóúü'.includes(char)) {
            if (!inVowel) syllables++;
            inVowel = true;
          } else if (char !== ' ') {
            inVowel = false;
          }
        }
        
        return {
          verse: verse.trim(),
          syllables: Math.max(1, syllables),
          words: verse.trim().split(/\s+/).length
        };
      });

      // Análisis de rima
      const lastWords = analysis.map(a => 
        a.verse.split(/\s+/).pop().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[.,;:!?¿¡()"\[\]]/g, '')
      );

      const rhymeScheme = detectRhymeScheme(lastWords);
      
      return {
        verses: analysis,
        totalVerses: verses.length,
        averageSyllables: analysis.reduce((sum, a) => sum + a.syllables, 0) / analysis.length,
        rhymeScheme,
        metricalPattern: getMetricalPattern(analysis.map(a => a.syllables))
      };
    }

    function detectRhymeScheme(words) {
      const groups = {};
      let currentLetter = 'A';
      const scheme = [];

      words.forEach(word => {
        const suffix = word.slice(-3); // Últimas 3 letras para rima
        
        let found = false;
        for (const [letter, suffixes] of Object.entries(groups)) {
          if (suffixes.some(s => suffix.includes(s.slice(-2)) || s.includes(suffix.slice(-2)))) {
            scheme.push(letter);
            groups[letter].push(suffix);
            found = true;
            break;
          }
        }
        
        if (!found) {
          groups[currentLetter] = [suffix];
          scheme.push(currentLetter);
          currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
        }
      });

      return scheme.join('');
    }

    function getMetricalPattern(syllableCounts) {
      const unique = [...new Set(syllableCounts)];
      if (unique.length === 1) {
        const count = unique[0];
        if (count === 8) return 'Octosílabos';
        if (count === 11) return 'Endecasílabos';
        if (count === 7) return 'Heptasílabos';
        return `${count} sílabas`;
      }
      return 'Métrica libre';
    }

    const analysis = analyzeMetrics(text);
    const sentiment = analyzeSentiment(text);

    // Generar explicación contextual
    let explanation = `📊 **Análisis Poético Completo**\n\n`;
    explanation += `🎭 **Estructura:**\n`;
    explanation += `• Versos: ${analysis.totalVerses}\n`;
    explanation += `• Métrica: ${analysis.metricalPattern}\n`;
    explanation += `• Rima: ${analysis.rhymeScheme}\n`;
    explanation += `• Promedio silábico: ${analysis.averageSyllables.toFixed(1)}\n\n`;
    
    explanation += `🎨 **Sentimiento:** ${sentiment}\n\n`;
    
    if (analysis.metricalPattern === 'Octosílabos') {
      explanation += `✨ **Observación:** Perfecto para el Carnaval gaditano. Los octosílabos son la base de las coplas carnavaleras.\n\n`;
    }
    
    explanation += `🔍 **Desglose por verso:**\n`;
    analysis.verses.forEach((verse, index) => {
      explanation += `${index + 1}. "${verse.verse}" (${verse.syllables} sílabas)\n`;
    });

    // Guardar análisis en base de datos
    if (userId) {
      db.run(`
        INSERT INTO poetry_analysis 
        (userId, text, analysis_result, verses_count, syllables_analysis, rhyme_scheme, sentiment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, 
        text, 
        JSON.stringify(analysis), 
        analysis.totalVerses,
        JSON.stringify(analysis.verses.map(v => v.syllables)),
        analysis.rhymeScheme,
        sentiment
      ]);
    }

    res.json({
      success: true,
      analysis,
      sentiment,
      explanation
    });

  } catch (error) {
    console.error('Error en análisis poético:', error);
    res.status(500).json({ 
      error: 'Error analizando el poema, pisha',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Trivia carnavalera
router.get('/trivia', async (req, res) => {
  const { difficulty = 'medium', category = 'carnaval' } = req.query;

  const triviaBank = {
    carnaval: {
      easy: [
        {
          pregunta: "¿En qué ciudad se celebra el Carnaval más famoso de España?",
          opciones: ["Sevilla", "Cádiz", "Madrid", "Barcelona"],
          respuestaCorrecta: 1,
          explicacion: "¡En Cádiz, pisha! La tacita de plata tiene el carnaval más famoso de España."
        },
        {
          pregunta: "¿Cómo se llama el teatro donde se celebra el COAC?",
          opciones: ["Teatro Real", "Teatro Falla", "Teatro Calderón", "Teatro Principal"],
          respuestaCorrecta: 1,
          explicacion: "¡El Teatro Falla! Donde se corona a los mejores del Carnaval gaditano."
        }
      ],
      medium: [
        {
          pregunta: "¿Cuántas modalidades compiten en el COAC?",
          opciones: ["3", "4", "5", "6"],
          respuestaCorrecta: 1,
          explicacion: "¡Son 4! Chirigotas, comparsas, coros y cuartetos. ¡Olé!"
        },
        {
          pregunta: "¿Qué agrupación escribió 'Los Millonarios'?",
          opciones: ["Chirigota", "Comparsa", "Coro", "Cuarteto"],
          respuestaCorrecta: 0,
          explicacion: "¡Una chirigota legendaria! Los Millonarios marcaron época en el Carnaval."
        }
      ],
      hard: [
        {
          pregunta: "¿En qué año se creó oficialmente el COAC?",
          opciones: ["1980", "1985", "1982", "1979"],
          respuestaCorrecta: 2,
          explicacion: "¡En 1982! Aunque el Carnaval gaditano es mucho más antiguo."
        }
      ]
    },
    cadiz: {
      easy: [
        {
          pregunta: "¿Cómo se conoce popularmente a Cádiz?",
          opciones: ["La Perla del Sur", "La Tacita de Plata", "La Joya Andaluza", "La Bella Gaditana"],
          respuestaCorrecta: 1,
          explicacion: "¡La Tacita de Plata! Por su forma y belleza únicas."
        }
      ],
      medium: [
        {
          pregunta: "¿Cuál es el estadio del Cádiz CF?",
          opciones: ["Ramón de Carranza", "Nuevo Mirandilla", "La Rosaleda", "El Arcángel"],
          respuestaCorrecta: 1,
          explicacion: "¡El Nuevo Mirandilla! Donde juega nuestro querido Cádiz CF."
        }
      ],
      hard: [
        {
          pregunta: "¿En qué año ascendió el Cádiz CF a Primera División por última vez?",
          opciones: ["2019", "2020", "2021", "2018"],
          respuestaCorrecta: 1,
          explicacion: "¡En 2020! Un ascenso histórico que emocionó a toda la ciudad."
        }
      ]
    }
  };

  try {
    const questions = triviaBank[category]?.[difficulty] || triviaBank.carnaval.medium;
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    res.json({
      success: true,
      trivia: randomQuestion,
      metadata: {
        difficulty,
        category,
        totalQuestions: questions.length
      }
    });

  } catch (error) {
    console.error('Error generando trivia:', error);
    res.status(500).json({ error: 'Error generando trivia carnavalera' });
  }
});

// Sistema de votos mejorado
router.post('/vote', async (req, res) => {
  const { agrupacion, categoria, puntuacion, comentario, userId } = req.body;
  const { db } = require('../app_enhanced');
  
  if (!agrupacion || !categoria || !puntuacion || puntuacion < 1 || puntuacion > 10) {
    return res.status(400).json({ error: 'Datos inválidos para votar' });
  }

  try {
    // Verificar si el usuario ya votó por esta agrupación
    db.get(
      'SELECT id FROM votes WHERE userId = ? AND agrupacion = ? AND categoria = ?',
      [userId, agrupacion, categoria],
      (err, existingVote) => {
        if (err) {
          return res.status(500).json({ error: 'Error verificando voto previo' });
        }

        if (existingVote) {
          return res.status(409).json({ 
            error: 'Ya has votado por esta agrupación en esta categoría' 
          });
        }

        // Insertar nuevo voto
        db.run(
          'INSERT INTO votes (userId, agrupacion, categoria, puntuacion, comentario, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, agrupacion, categoria, puntuacion, comentario, req.ip],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error guardando voto' });
            }
            
            // Invalidar cache de ranking
            const { cache } = require('../app_enhanced');
            cache.del('ranking');
            
            res.json({ 
              success: true,
              message: '¡Voto guardado correctamente! 🎉',
              voteId: this.lastID
            });
          }
        );
      }
    );

  } catch (error) {
    console.error('Error en sistema de votos:', error);
    res.status(500).json({ error: 'Error procesando voto' });
  }
});

// Ranking con cache inteligente
router.get('/ranking', async (req, res) => {
  const { cache, db } = require('../app_enhanced');
  const { categoria } = req.query;
  
  const cacheKey = `ranking_${categoria || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ success: true, rankings: cached, fromCache: true });
  }

  let query = `
    SELECT 
      agrupacion, 
      categoria, 
      AVG(puntuacion) as avgScore, 
      COUNT(*) as voteCount,
      MIN(puntuacion) as minScore,
      MAX(puntuacion) as maxScore
    FROM votes 
  `;
  
  let params = [];
  if (categoria) {
    query += ' WHERE categoria = ?';
    params.push(categoria);
  }
  
  query += ` 
    GROUP BY agrupacion, categoria 
    ORDER BY avgScore DESC, voteCount DESC
    LIMIT 50
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error obteniendo ranking' });
    }
    
    // Procesar datos para incluir más información
    const processedRankings = rows.map((row, index) => ({
      ...row,
      position: index + 1,
      avgScore: parseFloat(row.avgScore.toFixed(2)),
      scoreRange: `${row.minScore}-${row.maxScore}`
    }));
    
    cache.set(cacheKey, processedRankings, 300); // Cache por 5 minutos
    
    res.json({ 
      success: true, 
      rankings: processedRankings,
      totalVotes: rows.reduce((sum, row) => sum + row.voteCount, 0),
      fromCache: false
    });
  });
});

// Endpoint de estado del sistema
router.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'Chat contextual',
      'Análisis poético',
      'Sistema de votos',
      'Trivia carnavalera',
      'Memoria persistente'
    ]
  });
});

module.exports = router;
