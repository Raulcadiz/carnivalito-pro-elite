const natural = require('natural');

class PoetryService {
  constructor(logger) {
    this.logger = logger;
    this.syllablePatterns = this.initializeSyllablePatterns();
    this.rhymeDatabase = this.initializeRhymeDatabase();
    this.carnavalMetrics = this.initializeCarnavalMetrics();
    this.poeticDevices = this.initializePoeticDevices();
    this.andalusianPronunciation = this.initializeAndalusianPronunciation();
  }

  initializeSyllablePatterns() {
    return {
      vowels: 'aeiouáéíóúü',
      diphthongs: ['ai', 'ei', 'oi', 'ui', 'au', 'eu', 'ou', 'ia', 'ie', 'io', 'ue', 'ua', 'uo'],
      hiatus: ['aá', 'eé', 'ií', 'oó', 'uú', 'áa', 'ée', 'íi', 'óo', 'úu']
    };
  }

  initializeRhymeDatabase() {
    return {
      // Terminaciones comunes en coplas gaditanas
      asonante: {
        'a-o': ['gaditano', 'carnaval', 'mar', 'cantar', 'soñar', 'bailar'],
        'e-o': ['pueblo', 'cielo', 'vuelo', 'desvelo', 'anhelo'],
        'i-a': ['vida', 'herida', 'querida', 'partida', 'comida'],
        'o-a': ['hora', 'aurora', 'señora', 'demora', 'ahora']
      },
      consonante: {
        'ada': ['nada', 'Granada', 'jornada', 'alborada', 'mirada'],
        'ente': ['gente', 'presente', 'caliente', 'ambiente', 'corriente'],
        'ía': ['alegría', 'compañía', 'fantasía', 'rebeldía', 'poesía'],
        'or': ['amor', 'dolor', 'honor', 'candor', 'esplendor']
      }
    };
  }

  initializeCarnavalMetrics() {
    return {
      copla: {
        verses: 4,
        syllables: 8,
        rhyme: 'ABAB',
        description: 'Cuarteta octosílaba con rima consonante alternante'
      },
      seguidilla: {
        verses: 4,
        syllables: [7, 5, 7, 5],
        rhyme: 'ABCB',
        description: 'Seguidilla gitana típica del flamenco'
      },
      solea: {
        verses: 3,
        syllables: 8,
        rhyme: 'ABA',
        description: 'Terceto octosílabo de soleá'
      },
      tango: {
        verses: 4,
        syllables: 8,
        rhyme: 'ABCB',
        description: 'Cuarteta con rima en versos pares'
      }
    };
  }

  initializePoeticDevices() {
    return {
      aliteration: /\b(\w)\w*\s+\1\w*/gi,
      metaphor: ['como', 'cual', 'semejante', 'parecido'],
      anaphora: /^(\w+\s+\w+).*\n.*^\1/gm,
      personification: ['susurra', 'llora', 'ríe', 'baila', 'canta']
    };
  }

  initializeAndalusianPronunciation() {
    return {
      // Adaptaciones para el conteo silábico andaluz
      seseo: { 'z': 's', 'ce': 'se', 'ci': 'si' },
      yeísmo: { 'll': 'y' },
      aspiración: { 's': 'h' }, // Final de sílaba
      pérdida_d: { 'ado': 'ao', 'ada': 'aa', 'ido': 'io' }
    };
  }

  async analyzePoem(text, analysisLevel = 'complete') {
    try {
      const startTime = Date.now();
      
      // Preparar texto
      const cleanedText = this.cleanText(text);
      const verses = this.extractVerses(cleanedText);
      
      if (verses.length === 0) {
        throw new Error('No se encontraron versos válidos en el texto');
      }

      // Análisis métrico
      const metricAnalysis = this.analyzeMetrics(verses);
      
      // Análisis de rima
      const rhymeAnalysis = this.analyzeRhyme(verses);
      
      // Análisis básico o completo
      let analysis = {
        verses: metricAnalysis.verses,
        totalVerses: verses.length,
        metrics: metricAnalysis,
        rhyme: rhymeAnalysis,
        processingTime: Date.now() - startTime
      };

      if (analysisLevel === 'complete') {
        analysis = {
          ...analysis,
          sentiment: this.analyzeSentiment(text),
          carnavalStyle: this.analyzeCarnavalStyle(verses),
          poeticDevices: this.analyzePoeticDevices(text),
          improvements: this.suggestImprovements(verses, metricAnalysis, rhymeAnalysis)
        };
      }

      this.logger.info(`Análisis poético completado en ${analysis.processingTime}ms`);
      return analysis;

    } catch (error) {
      this.logger.error('Error analizando poema:', error);
      throw error;
    }
  }

  cleanText(text) {
    return text
      .replace(/[""'']/g, '"') // Normalizar comillas
      .replace(/[–—]/g, '-') // Normalizar guiones
      .replace(/\s+/g, ' ') // Múltiples espacios
      .replace(/^\s+|\s+$/gm, '') // Espacios al inicio/final de líneas
      .trim();
  }

  extractVerses(text) {
    return text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^[\d\s\-_=]+$/)); // Filtrar separadores
  }

  analyzeMetrics(verses) {
    const verseAnalysis = verses.map((verse, index) => {
      const syllables = this.countSyllables(verse);
      const stress = this.analyzeStress(verse);
      
      return {
        number: index + 1,
        text: verse,
        syllables,
        stress,
        words: verse.split(/\s+/).length,
        ending: this.getVerseEnding(verse)
      };
    });

    // Determinar patrón métrico
    const syllableCounts = verseAnalysis.map(v => v.syllables);
    const metricalPattern = this.determineMetricalPattern(syllableCounts);
    
    // Estadísticas
    const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    const syllableVariation = Math.max(...syllableCounts) - Math.min(...syllableCounts);

    return {
      verses: verseAnalysis,
      pattern: metricalPattern,
      statistics: {
        averageSyllables: Math.round(avgSyllables * 100) / 100,
        syllableVariation,
        isRegular: syllableVariation <= 1,
        dominantMeter: this.getMostCommon(syllableCounts)
      }
    };
  }

  countSyllables(text) {
    let word = text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remover acentos para análisis
      .replace(/[^\w\sáéíóúü]/g, '') // Solo letras y espacios
      .trim();

    if (!word) return 0;

    const words = word.split(/\s+/);
    let totalSyllables = 0;

    for (const singleWord of words) {
      totalSyllables += this.countWordSyllables(singleWord);
    }

    // Aplicar reglas de sinalefa (unión vocálica entre palabras)
    totalSyllables -= this.applySinalefa(words);

    return Math.max(1, totalSyllables);
  }

  countWordSyllables(word) {
    if (!word) return 0;

    const vowels = this.syllablePatterns.vowels;
    let syllables = 0;
    let prevWasVowel = false;
    let i = 0;

    while (i < word.length) {
      const char = word[i];
      const nextChar = word[i + 1] || '';
      
      if (vowels.includes(char)) {
        // Verificar si es diptongo
        if (this.isDiphthong(char + nextChar)) {
          if (!prevWasVowel) syllables++;
          prevWasVowel = true;
          i += 2;
          continue;
        }
        
        // Verificar hiato
        if (this.isHiatus(char + nextChar)) {
          syllables++;
          prevWasVowel = true;
          i++;
          continue;
        }
        
        // Vocal normal
        if (!prevWasVowel) {
          syllables++;
        }
        prevWasVowel = true;
      } else {
        prevWasVowel = false;
      }
      
      i++;
    }

    return Math.max(1, syllables);
  }

  isDiphthong(twoChars) {
    return this.syllablePatterns.diphthongs.includes(twoChars.toLowerCase());
  }

  isHiatus(twoChars) {
    return this.syllablePatterns.hiatus.includes(twoChars.toLowerCase());
  }

  applySinalefa(words) {
    let sinalefas = 0;
    
    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];
      
      if (currentWord && nextWord) {
        const lastChar = currentWord.slice(-1);
        const firstChar = nextWord.charAt(0);
        
        if (this.syllablePatterns.vowels.includes(lastChar) && 
            this.syllablePatterns.vowels.includes(firstChar)) {
          sinalefas++;
        }
      }
    }
    
    return sinalefas;
  }

  analyzeStress(verse) {
    // Análisis básico de acentuación
    const words = verse.toLowerCase().split(/\s+/);
    const stressPattern = [];
    
    words.forEach(word => {
      if (word.match(/[áéíóú]/)) {
        stressPattern.push('tónica');
      } else if (word.length > 2) {
        // Reglas básicas de acentuación
        if (word.match(/[aeiou]s?$/)) {
          stressPattern.push('llana');
        } else {
          stressPattern.push('aguda');
        }
      } else {
        stressPattern.push('átona');
      }
    });
    
    return stressPattern.join('-');
  }

  getVerseEnding(verse) {
    const words = verse.toLowerCase().split(/\s+/);
    const lastWord = words[words.length - 1];
    
    if (!lastWord) return '';
    
    // Obtener las últimas 3 letras para análisis de rima
    return lastWord.slice(-3);
  }

  determineMetricalPattern(syllableCounts) {
    const unique = [...new Set(syllableCounts)];
    
    if (unique.length === 1) {
      const count = unique[0];
      switch (count) {
        case 8: return 'Octosílabos';
        case 11: return 'Endecasílabos';
        case 7: return 'Heptasílabos';
        case 9: return 'Eneasílabos';
        case 6: return 'Hexasílabos';
        default: return `${count} sílabas`;
      }
    }
    
    // Patrones mixtos comunes
    if (JSON.stringify(syllableCounts) === JSON.stringify([7, 5, 7, 5])) {
      return 'Seguidilla';
    }
    
    return 'Métrica libre';
  }

  analyzeRhyme(verses) {
    const endings = verses.map(verse => this.getVowelPattern(verse));
    const rhymeScheme = this.detectRhymeScheme(endings);
    
    return {
      scheme: rhymeScheme.pattern,
      type: rhymeScheme.type,
      quality: this.evaluateRhymeQuality(endings),
      details: endings.map((ending, index) => ({
        verse: index + 1,
        ending,
        rhymeGroup: rhymeScheme.groups[index]
      }))
    };
  }

  getVowelPattern(verse) {
    const lastWord = verse.toLowerCase().split(/\s+/).pop();
    if (!lastWord) return '';
    
    // Extraer patrón vocálico para rima asonante
    const vowelPattern = lastWord.replace(/[^aeiouáéíóú]/g, '');
    
    // Para rima consonante, usar las últimas 3 letras
    const consonantPattern = lastWord.slice(-3);
    
    return {
      asonant: vowelPattern.slice(-2), // Últimas dos vocales
      consonant: consonantPattern,
      word: lastWord
    };
  }

  detectRhymeScheme(patterns) {
    const groups = [];
    const rhymeMap = new Map();
    let currentLabel = 'A';
    
    patterns.forEach((pattern, index) => {
      let foundRhyme = null;
      
      // Buscar rima consonante primero
      for (const [existingPattern, label] of rhymeMap.entries()) {
        if (this.rhymesConsonant(pattern.consonant, existingPattern.consonant)) {
          foundRhyme = label;
          break;
        }
      }
      
      // Si no hay consonante, buscar asonante
      if (!foundRhyme) {
        for (const [existingPattern, label] of rhymeMap.entries()) {
          if (this.rhymesAsonant(pattern.asonant, existingPattern.asonant)) {
            foundRhyme = label;
            break;
          }
        }
      }
      
      if (foundRhyme) {
        groups[index] = foundRhyme;
      } else {
        groups[index] = currentLabel;
        rhymeMap.set(pattern, currentLabel);
        currentLabel = String.fromCharCode(currentLabel.charCodeAt(0) + 1);
      }
    });
    
    // Determinar tipo de rima
    let rhymeType = 'libre';
    const hasConsonantRhymes = patterns.some((p1, i) => 
      patterns.some((p2, j) => i !== j && this.rhymesConsonant(p1.consonant, p2.consonant))
    );
    
    if (hasConsonantRhymes) {
      rhymeType = 'consonante';
    } else {
      const hasAsonantRhymes = patterns.some((p1, i) => 
        patterns.some((p2, j) => i !== j && this.rhymesAsonant(p1.asonant, p2.asonant))
      );
      if (hasAsonantRhymes) rhymeType = 'asonante';
    }
    
    return {
      pattern: groups.join(''),
      type: rhymeType,
      groups
    };
  }

  rhymesConsonant(ending1, ending2) {
    if (!ending1 || !ending2 || ending1.length < 2 || ending2.length < 2) return false;
    return ending1.slice(-2) === ending2.slice(-2);
  }

  rhymesAsonant(vowels1, vowels2) {
    if (!vowels1 || !vowels2 || vowels1.length < 1 || vowels2.length < 1) return false;
    return vowels1 === vowels2;
  }

  evaluateRhymeQuality(patterns) {
    let score = 0;
    let totalPairs = 0;
    
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        totalPairs++;
        if (this.rhymesConsonant(patterns[i].consonant, patterns[j].consonant)) {
          score += 3;
        } else if (this.rhymesAsonant(patterns[i].asonant, patterns[j].asonant)) {
          score += 2;
        } else if (patterns[i].consonant.slice(-1) === patterns[j].consonant.slice(-1)) {
          score += 1; // Rima parcial
        }
      }
    }
    
    if (totalPairs === 0) return 0;
    
    const quality = score / (totalPairs * 3);
    
    if (quality > 0.8) return 'excelente';
    if (quality > 0.6) return 'buena';
    if (quality > 0.4) return 'regular';
    if (quality > 0.2) return 'débil';
    return 'sin rima';
  }

  analyzeCarnavalStyle(verses) {
    let score = 0;
    const features = [];
    
    const text = verses.join(' ').toLowerCase();
    
    // Vocabulario carnavalero
    const carnavalWords = [
      'carnaval', 'chirigota', 'comparsa', 'coro', 'cuarteto',
      'falla', 'coac', 'cadiz', 'cádiz', 'gaditano', 'tacita',
      'caleta', 'mar', 'sal', 'barrio', 'pueblo'
    ];
    
    carnavalWords.forEach(word => {
      if (text.includes(word)) {
        score += 0.1;
        features.push(`Vocabulario carnavalero: "${word}"`);
      }
    });
    
    // Expresiones gaditanas
    const gaditanExpressions = [
      'pisha', 'mostro', 'zambombazo', 'salero', 'arte',
      'olé', 'viva', 'ay mare', 'qué rico'
    ];
    
    gaditanExpressions.forEach(expr => {
      if (text.includes(expr)) {
        score += 0.15;
        features.push(`Expresión gaditana: "${expr}"`);
      }
    });
    
    // Métrica típica (octosílabos)
    const syllableCounts = verses.map(v => this.countSyllables(v));
    const hasOctosyllables = syllableCounts.filter(s => s === 8).length >= verses.length * 0.5;
    
    if (hasOctosyllables) {
      score += 0.3;
      features.push('Métrica octosílaba tradicional');
    }
    
    // Rima tradicional
    const rhymeAnalysis = this.analyzeRhyme(verses);
    if (rhymeAnalysis.type === 'consonante' || rhymeAnalysis.type === 'asonante') {
      score += 0.2;
      features.push(`Rima ${rhymeAnalysis.type} tradicional`);
    }
    
    return {
      score: Math.min(score, 1.0),
      level: this.getStyleLevel(score),
      features,
      recommendations: this.getStyleRecommendations(score, features)
    };
  }

  getStyleLevel(score) {
    if (score >= 0.8) return 'auténtico carnavalero';
    if (score >= 0.6) return 'estilo carnavalero';
    if (score >= 0.4) return 'reminiscencias carnavaleras';
    if (score >= 0.2) return 'algunas influencias carnavaleras';
    return 'estilo no carnavalero';
  }

  getStyleRecommendations(score, features) {
    const recommendations = [];
    
    if (score < 0.3) {
      recommendations.push('Incluye más vocabulario típico del Carnaval de Cádiz');
      recommendations.push('Usa expresiones gaditanas como "pisha", "mostro", "salero"');
    }
    
    if (!features.some(f => f.includes('octosílaba'))) {
      recommendations.push('Considera usar octosílabos (8 sílabas por verso)');
    }
    
    if (!features.some(f => f.includes('Rima'))) {
      recommendations.push('Añade rima consonante o asonante para mayor musicalidad');
    }
    
    if (score < 0.5) {
      recommendations.push('Referencias al mar, La Caleta, o la vida gaditana enriquecerían el texto');
    }
    
    return recommendations;
  }

  suggestImprovements(verses, metricAnalysis, rhymeAnalysis) {
    const suggestions = [];
    
    // Mejoras métricas
    if (metricAnalysis.statistics.syllableVariation > 2) {
      suggestions.push({
        type: 'métrica',
        priority: 'alta',
        description: 'Regularizar el número de sílabas por verso',
        details: `Variación actual: ${metricAnalysis.statistics.syllableVariation} sílabas`
      });
    }
    
    // Mejoras de rima
    if (rhymeAnalysis.quality === 'sin rima' || rhymeAnalysis.quality === 'débil') {
      suggestions.push({
        type: 'rima',
        priority: 'media',
        description: 'Fortalecer la rima entre versos',
        details: `Calidad actual: ${rhymeAnalysis.quality}`
      });
    }
    
    // Sugerencias específicas por verso
    verses.forEach((verse, index) => {
      const verseData = metricAnalysis.verses[index];
      
      if (verseData.syllables < 6 || verseData.syllables > 12) {
        suggestions.push({
          type: 'verso específico',
          priority: 'media',
          description: `Verso ${index + 1}: ajustar longitud`,
          details: `${verseData.syllables} sílabas - considera entre 7-11`,
          verse: verse
        });
      }
    });
    
    return suggestions;
  }

  getMostCommon(arr) {
    const frequency = {};
    arr.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  async generateCarnavalPoetry(theme, style = 'chirigota', verses = 4) {
    try {
      const template = this.carnavalMetrics[style] || this.carnavalMetrics.copla;
      const generatedVerses = [];
      
      // Base vocabulario según el tema
      const themeWords = this.getThemeVocabulary(theme);
      const rhymeWords = this.getRhymeWordsForTheme(theme);
      
      for (let i = 0; i < verses; i++) {
        const targetSyllables = Array.isArray(template.syllables) 
          ? template.syllables[i] 
          : template.syllables;
          
        const verse = this.generateVerse(themeWords, targetSyllables, i, template.rhyme);
        generatedVerses.push(verse);
      }
      
      const poem = generatedVerses.join('\n');
      const analysis = await this.analyzePoem(poem, 'basic');
      
      return {
        poem,
        style,
        theme,
        analysis,
        metadata: {
          generated: true,
          timestamp: new Date().toISOString(),
          targetPattern: template
        }
      };
      
    } catch (error) {
      this.logger.error('Error generando poesía:', error);
      throw error;
    }
  }

  getThemeVocabulary(theme) {
    const vocabulary = {
      carnaval: ['fiesta', 'alegría', 'música', 'baile', 'color', 'risa', 'sueño'],
      cadiz: ['mar', 'sal', 'caleta', 'torre', 'puerto', 'brisa', 'arena'],
      amor: ['corazón', 'alma', 'beso', 'caricia', 'sueño', 'pasión', 'ternura'],
      nostalgia: ['recuerdo', 'tiempo', 'ayer', 'lágrima', 'suspiro', 'añoranza'],
      futbol: ['gol', 'campo', 'victoria', 'afición', 'orgullo', 'equipo', 'triunfo']
    };
    
    return vocabulary[theme] || vocabulary.carnaval;
  }

  generateVerse(themeWords, targetSyllables, position, rhymeScheme) {
    // Generador básico de versos - en producción usaría algoritmos más sofisticados
    const articles = ['el', 'la', 'un', 'una', 'los', 'las'];
    const prepositions = ['de', 'en', 'con', 'por', 'para', 'sin', 'sobre'];
    const conjunctions = ['y', 'o', 'pero', 'que', 'si', 'cuando'];
    
    let verse = '';
    let syllableCount = 0;
    
    // Construcción básica: artículo + sustantivo + verbo + complemento
    const word = themeWords[Math.floor(Math.random() * themeWords.length)];
    verse = `En ${word} gaditano`;
    
    // Ajustar a las sílabas objetivo (muy básico)
    while (this.countSyllables(verse) < targetSyllables - 1) {
      const filler = ['que brilla', 'con arte', 'del alma', 'que canta'][
        Math.floor(Math.random() * 4)
      ];
      verse += ` ${filler}`;
    }
    
    return verse;
  }
}

module.exports = PoetryService;
