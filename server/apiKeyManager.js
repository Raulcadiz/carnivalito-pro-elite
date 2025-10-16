const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class APIKeyManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyFile = path.join(__dirname, '../data/keys.enc');
    this.rotationInterval = 24 * 60 * 60 * 1000; // 24 horas
    this.currentKey = null;
    this.initializeKeyManagement();
  }

  initializeKeyManagement() {
    // Generar clave maestra si no existe
    if (!process.env.ENCRYPTION_KEY) {
      const masterKey = crypto.randomBytes(32).toString('hex');
      console.log('Clave maestra generada. Agrega a .env: ENCRYPTION_KEY=' + masterKey);
      process.env.ENCRYPTION_KEY = masterKey;
    }

    this.loadOrCreateKeys();
    this.startRotationScheduler();
  }

  generateRotatingKey() {
    const timestamp = Date.now();
    const dayKey = Math.floor(timestamp / this.rotationInterval);
    return crypto.createHash('sha256')
      .update(process.env.ENCRYPTION_KEY + dayKey.toString())
      .digest();
  }

  encryptAPIKey(apiKey) {
    try {
      const key = this.generateRotatingKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error cifrando API key:', error);
      throw error;
    }
  }

  decryptAPIKey(encryptedData) {
    try {
      const key = this.generateRotatingKey();
      const decipher = crypto.createDecipher(
        this.algorithm, 
        key, 
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error descifrando API key:', error);
      throw error;
    }
  }

  storeEncryptedKeys(keys) {
    const encryptedKeys = {};
    
    for (const [service, apiKey] of Object.entries(keys)) {
      if (apiKey && apiKey.trim()) {
        encryptedKeys[service] = this.encryptAPIKey(apiKey);
      }
    }

    fs.writeFileSync(this.keyFile, JSON.stringify(encryptedKeys, null, 2));
    console.log('Claves API cifradas y almacenadas correctamente');
  }

  loadEncryptedKeys() {
    try {
      if (!fs.existsSync(this.keyFile)) {
        return {};
      }

      const encryptedData = JSON.parse(fs.readFileSync(this.keyFile, 'utf8'));
      const decryptedKeys = {};

      for (const [service, encData] of Object.entries(encryptedData)) {
        try {
          decryptedKeys[service] = this.decryptAPIKey(encData);
        } catch (error) {
          console.warn(`No se pudo descifrar la clave para ${service}:`, error.message);
        }
      }

      return decryptedKeys;
    } catch (error) {
      console.error('Error cargando claves cifradas:', error);
      return {};
    }
  }

  loadOrCreateKeys() {
    const envKeys = {
      groq: process.env.GROQ_API_KEY,
      huggingface: process.env.HUGGINGFACE_API_KEY,
      google_tts: process.env.GOOGLE_TTS_API_KEY
    };

    // Filtrar claves vacías
    const validKeys = Object.fromEntries(
      Object.entries(envKeys).filter(([_, value]) => value && value.trim())
    );

    if (Object.keys(validKeys).length > 0) {
      this.storeEncryptedKeys(validKeys);
    }
  }

  getAPIKey(service) {
    const keys = this.loadEncryptedKeys();
    return keys[service] || null;
  }

  updateAPIKey(service, newKey) {
    const currentKeys = this.loadEncryptedKeys();
    currentKeys[service] = newKey;
    
    const keysToStore = {};
    keysToStore[service] = newKey;
    this.storeEncryptedKeys(keysToStore);
    
    console.log(`Clave API para ${service} actualizada y cifrada`);
  }

  rotateKeys() {
    console.log('Iniciando rotación de claves...');
    
    try {
      const currentKeys = this.loadEncryptedKeys();
      
      if (Object.keys(currentKeys).length > 0) {
        // Re-cifrar con la nueva clave rotativa
        this.storeEncryptedKeys(currentKeys);
        console.log('Rotación de claves completada exitosamente');
      }
    } catch (error) {
      console.error('Error durante la rotación de claves:', error);
    }
  }

  startRotationScheduler() {
    // Programar rotación cada 24 horas
    setInterval(() => {
      this.rotateKeys();
    }, this.rotationInterval);

    console.log('Planificador de rotación de claves iniciado (cada 24h)');
  }

  validateKeyIntegrity() {
    try {
      const keys = this.loadEncryptedKeys();
      const validKeys = Object.keys(keys).filter(service => {
        try {
          const key = this.getAPIKey(service);
          return key && key.length > 10; // Validación básica
        } catch {
          return false;
        }
      });

      return {
        total: Object.keys(keys).length,
        valid: validKeys.length,
        services: validKeys
      };
    } catch (error) {
      return { total: 0, valid: 0, services: [], error: error.message };
    }
  }

  // Método para limpiar claves en memoria (seguridad)
  clearMemoryKeys() {
    this.currentKey = null;
    if (global.gc) {
      global.gc(); // Forzar garbage collection si está disponible
    }
  }

  // Backup seguro de claves
  createSecureBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, '../backups/', `keys-backup-${timestamp}.enc`);
    
    if (fs.existsSync(this.keyFile)) {
      fs.copyFileSync(this.keyFile, backupPath);
      console.log(`Backup seguro de claves creado: ${backupPath}`);
      return backupPath;
    }
    
    return null;
  }
}

module.exports = APIKeyManager;
