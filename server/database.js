const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class DatabaseManager {
  constructor() {
    this.dbPath = process.env.DB_PATH || './data/carnivalito.db';
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Asegurar que el directorio existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          throw new Error(`Error conectando a la base de datos: ${err.message}`);
        }
      });

      await this.createTables();
      await this.createIndexes();
      this.isInitialized = true;
      
      console.log('Base de datos inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando base de datos:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Tabla de usuarios con más campos
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE NOT NULL,
        username TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 1,
        preferences TEXT, -- JSON
        learning_profile TEXT, -- JSON
        voice_settings TEXT, -- JSON
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'active'
      )`,

      // Conversaciones con análisis avanzado
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        context_data TEXT, -- JSON
        sentiment_analysis TEXT, -- JSON
        topic_classification TEXT,
        response_quality_score REAL,
        user_feedback INTEGER, -- 1-5 rating
        response_time_ms INTEGER,
        ai_model_used TEXT,
        ip_address TEXT,
        FOREIGN KEY (userId) REFERENCES users (userId)
      )`,

      // Análisis poético avanzado
      `CREATE TABLE IF NOT EXISTS poetry_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        original_text TEXT NOT NULL,
        verses_count INTEGER,
        syllable_analysis TEXT, -- JSON
        rhyme_scheme TEXT,
        meter_analysis TEXT, -- JSON
        sentiment_score REAL,
        carnaval_style_score REAL,
        improvement_suggestions TEXT, -- JSON
        analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        processing_time_ms INTEGER,
        FOREIGN KEY (userId) REFERENCES users (userId)
      )`,

      // Sistema de votos mejorado
      `CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        agrupacion TEXT NOT NULL,
        categoria TEXT NOT NULL,
        puntuacion INTEGER NOT NULL CHECK(puntuacion >= 1 AND puntuacion <= 10),
        comentario TEXT,
        detailed_scores TEXT, -- JSON para puntuaciones detalladas
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT,
        ip_address TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (userId) REFERENCES users (userId),
        UNIQUE(userId, agrupacion, categoria) -- Evitar votos duplicados
      )`,

      // Sistema de aprendizaje
      `CREATE TABLE IF NOT EXISTS learning_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interaction_id TEXT UNIQUE NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        user_feedback_rating INTEGER, -- 1-5
        user_feedback_text TEXT,
        context_similarity_score REAL,
        response_effectiveness REAL,
        learning_category TEXT,
        improvement_applied BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Configuración del sistema
      `CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        category TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT
      )`,

      // Logs de actividad
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        action TEXT NOT NULL,
        details TEXT, -- JSON
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id TEXT
      )`,

      // Métricas y estadísticas
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_data TEXT, -- JSON para datos adicionales
        category TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Coplas y contenido generado
      `CREATE TABLE IF NOT EXISTS generated_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        content_type TEXT NOT NULL, -- 'copla', 'pasodoble', 'tango', etc.
        original_prompt TEXT,
        generated_text TEXT NOT NULL,
        style_analysis TEXT, -- JSON
        quality_score REAL,
        user_rating INTEGER,
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (userId)
      )`,

      // Sistema de notificaciones
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL, -- 'info', 'warning', 'success', 'error'
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (userId) REFERENCES users (userId)
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations(userId)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_topic ON conversations(topic_classification)',
      'CREATE INDEX IF NOT EXISTS idx_users_userId ON users(userId)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active)',
      'CREATE INDEX IF NOT EXISTS idx_votes_agrupacion ON votes(agrupacion)',
      'CREATE INDEX IF NOT EXISTS idx_votes_categoria ON votes(categoria)',
      'CREATE INDEX IF NOT EXISTS idx_learning_data_created_at ON learning_data(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs(userId)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)'
    ];

    for (const index of indexes) {
      await this.runQuery(index);
    }
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Métodos específicos para el sistema de aprendizaje
  async saveConversation(data) {
    const {
      userId, message, response, sessionId, contextData,
      sentimentAnalysis, topicClassification, responseQualityScore,
      responseTimeMs, aiModelUsed, ipAddress
    } = data;

    return this.runQuery(`
      INSERT INTO conversations (
        userId, message, response, session_id, context_data,
        sentiment_analysis, topic_classification, response_quality_score,
        response_time_ms, ai_model_used, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, message, response, sessionId, JSON.stringify(contextData),
      JSON.stringify(sentimentAnalysis), topicClassification, responseQualityScore,
      responseTimeMs, aiModelUsed, ipAddress
    ]);
  }

  async updateUserActivity(userId, incrementMessages = true) {
    const updates = ['last_active = CURRENT_TIMESTAMP'];
    const params = [];

    if (incrementMessages) {
      updates.push('total_messages = total_messages + 1');
    }

    const sql = `
      INSERT INTO users (userId, ${updates.join(', ')}) 
      VALUES (?, CURRENT_TIMESTAMP${incrementMessages ? ', 1' : ''})
      ON CONFLICT(userId) DO UPDATE SET ${updates.join(', ')}
    `;

    return this.runQuery(sql, [userId, ...params]);
  }

  async saveLearningData(data) {
    const {
      interactionId, userMessage, aiResponse, userFeedbackRating,
      userFeedbackText, contextSimilarityScore, responseEffectiveness,
      learningCategory
    } = data;

    return this.runQuery(`
      INSERT INTO learning_data (
        interaction_id, user_message, ai_response, user_feedback_rating,
        user_feedback_text, context_similarity_score, response_effectiveness,
        learning_category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      interactionId, userMessage, aiResponse, userFeedbackRating,
      userFeedbackText, contextSimilarityScore, responseEffectiveness,
      learningCategory
    ]);
  }

  async getConversationHistory(userId, limit = 50) {
    return this.allQuery(`
      SELECT message, response, timestamp, topic_classification, sentiment_analysis
      FROM conversations 
      WHERE userId = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [userId, limit]);
  }

  async getUserProfile(userId) {
    return this.getQuery(`
      SELECT * FROM users WHERE userId = ?
    `, [userId]);
  }

  async getSystemStats() {
    const queries = {
      totalUsers: 'SELECT COUNT(*) as count FROM users',
      totalConversations: 'SELECT COUNT(*) as count FROM conversations',
      conversationsToday: `
        SELECT COUNT(*) as count FROM conversations 
        WHERE date(timestamp) = date('now')
      `,
      activeUsersToday: `
        SELECT COUNT(*) as count FROM users 
        WHERE date(last_active) = date('now')
      `,
      averageResponseQuality: `
        SELECT AVG(response_quality_score) as avg_score 
        FROM conversations 
        WHERE response_quality_score IS NOT NULL
      `,
      topTopics: `
        SELECT topic_classification, COUNT(*) as count 
        FROM conversations 
        WHERE topic_classification IS NOT NULL 
        GROUP BY topic_classification 
        ORDER BY count DESC 
        LIMIT 10
      `
    };

    const stats = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        if (key === 'topTopics') {
          stats[key] = await this.allQuery(query);
        } else {
          const result = await this.getQuery(query);
          stats[key] = result ? (result.count || result.avg_score || 0) : 0;
        }
      } catch (error) {
        console.error(`Error ejecutando query ${key}:`, error);
        stats[key] = 0;
      }
    }

    return stats;
  }

  async saveMetric(metricName, metricValue, metricData = null, category = null) {
    return this.runQuery(`
      INSERT INTO metrics (metric_name, metric_value, metric_data, category)
      VALUES (?, ?, ?, ?)
    `, [metricName, metricValue, JSON.stringify(metricData), category]);
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      process.env.DB_BACKUP_PATH || './backups', 
      `carnivalito-backup-${timestamp}.db`
    );

    return new Promise((resolve, reject) => {
      const backup = this.db.backup(backupPath);
      backup.step(-1, (err) => {
        if (err) {
          reject(err);
        } else {
          backup.finish((err) => {
            if (err) {
              reject(err);
            } else {
              resolve(backupPath);
            }
          });
        }
      });
    });
  }

  async cleanOldData(daysToKeep = 90) {
    const queries = [
      `DELETE FROM conversations WHERE timestamp < datetime('now', '-${daysToKeep} days')`,
      `DELETE FROM activity_logs WHERE timestamp < datetime('now', '-${daysToKeep} days')`,
      `DELETE FROM metrics WHERE timestamp < datetime('now', '-${daysToKeep} days')`
    ];

    let totalDeleted = 0;
    for (const query of queries) {
      const result = await this.runQuery(query);
      totalDeleted += result.changes;
    }

    return totalDeleted;
  }

  isConnected() {
    return this.isInitialized && this.db !== null;
  }

  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

module.exports = DatabaseManager;
