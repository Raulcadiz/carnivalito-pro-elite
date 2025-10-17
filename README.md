# 🎭 Carnivalito Pro Elite

**Chat carnavalero avanzado con IA, memoria persistente y funcionalidades profesionales**

![Version](https://img.shields.io/badge/version-2.0.0-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Características Principales

### 🎯 Funcionalidades Core
- **Chat inteligente** con memoria conversacional persistente
- **Análisis poético** avanzado (métrica, rima, sentimiento)
- **Sistema de votos** para agrupaciones carnavaleras
- **Trivia interactiva** con múltiples niveles de dificultad
- **Reconocimiento de voz** con síntesis personalizada
- **Panel de administración** completo con estadísticas

### 🎨 Características Técnicas
- **APIs múltiples**: Groq + HuggingFace + respuestas locales inteligentes
- **Base de datos SQLite** con esquemas optimizados
- **Cache inteligente** para mejor rendimiento
- **Rate limiting** avanzado para prevenir abuso
- **Seguridad reforzada** con Helmet, JWT, y validación
- **Logging completo** con Winston
- **Backup automático** de datos

### 🎭 Especialización Gaditana
- **Conocimiento experto** en Carnaval de Cádiz
- **Base de datos** del Cádiz CF
- **Análisis métrico** específico para coplas carnavaleras
- **Expresiones auténticas** gaditanas
- **Referencias culturales** locales

## 📋 Requisitos Previos

```bash
- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
```

## 🔧 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/carnivalito-pro-elite.git
cd carnivalito-pro-elite
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env
```

### 4. Configurar APIs (Requerido)

#### Groq API (Recomendado)
1. Ir a [Groq Console](https://console.groq.com/)
2. Crear cuenta gratuita
3. Generar API Key
4. Añadir a `.env`: `GROQ_API_KEY=tu_clave_aqui`

#### HuggingFace API (Opcional - Backup)
1. Ir a [HuggingFace](https://huggingface.co/settings/tokens)
2. Crear token gratuito
3. Añadir a `.env`: `HF_API_KEY=tu_token_aqui`

### 5. Configurar seguridad
```bash
# Cambiar en .env:
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_contraseña_super_segura
```

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

### Acceso
- **Chat Principal**: http://localhost:3000
- **Panel Admin**: http://localhost:3000/admin

## 📁 Estructura del Proyecto

```
carnivalito-pro-elite/
├── app_enhanced.js              # Servidor principal
├── routes/
│   └── ai_enhanced.js          # Rutas de IA y funcionalidades
├── public/
│   └── carnival_pro_enhanced.html  # Frontend mejorado
├── scripts/
│   ├── setup.js                # Script de configuración inicial
│   ├── backup.js               # Sistema de backup
│   └── migrate.js              # Migraciones de DB
├── logs/                       # Logs del sistema
├── backups/                    # Backups automáticos
├── package.json
├── .env.example
└── README.md
```

## 🎛️ Panel de Administración

### Funcionalidades Admin
- **Estadísticas en tiempo real**
- **Gestión de configuración de APIs**
- **Monitor de conversaciones**
- **Sistema de ranking**
- **Logs y debugging**

### Acceso Seguro
- Autenticación JWT
- Rate limiting específico
- Cookies httpOnly
- Logging de intentos de acceso

## 🔒 Seguridad

### Medidas Implementadas
- **Helmet.js** - Headers de seguridad
- **Rate limiting** - Prevención de abuso
- **JWT** - Autenticación segura
- **Validación de entrada** - Joi schemas
- **CORS configurado** - Origen específico
- **Variables de entorno** - Credenciales seguras

### Recomendaciones Producción
1. Usar HTTPS obligatorio
2. Configurar reverse proxy (nginx)
3. Implementar WAF
4. Monitoreo de logs
5. Backup automático diario

## 📊 API Endpoints

### Chat Principal
```bash
POST /api/ai/chat
{
  "message": "¡Hola, pisha!",
  "userId": "user_123",
  "sessionId": "session_456"
}
```

### Análisis Poético
```bash
POST /api/ai/analyze-poem
{
  "text": "En Cádiz la bella...",
  "userId": "user_123"
}
```

### Trivia
```bash
GET /api/ai/trivia?difficulty=medium&category=carnaval
```

### Sistema de Votos
```bash
POST /api/ai/vote
{
  "agrupacion": "Los Millonarios",
  "categoria": "chirigota",
  "puntuacion": 9,
  "userId": "user_123"
}
```

### Ranking
```bash
GET /api/ai/ranking?categoria=chirigota
```

## 🎯 Funcionalidades Avanzadas

### Memoria Conversacional
- Contexto automático de últimas 5 conversaciones
- Análisis de sentimiento y temas
- Persistencia en SQLite
- Exportación de memoria

### Análisis Poético
- Conteo de sílabas preciso
- Detección de esquemas de rima
- Identificación de patrones métricos
- Análisis de sentimiento contextual

### Sistema de Votos
- Prevención de votos duplicados
- Ranking dinámico con cache
- Estadísticas detalladas
- Comentarios opcionales

## 🐛 Debugging

### Logs
```bash
# Ver logs en tiempo real
tail -f logs/carnivalito.log

# Logs de desarrollo
npm run dev
```

### Base de Datos
```bash
# Acceder a SQLite
sqlite3 carnival_pro_elite.db
.tables
SELECT * FROM conversations LIMIT 5;
```

## 🔄 Deployment

### VPS Ubuntu (Recomendado)
```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clonar y configurar
git clone https://github.com/tu-usuario/carnivalito-pro-elite.git
cd carnivalito-pro-elite
npm install

# 4. Configurar variables de entorno
cp .env.example .env
nano .env

# 5. Usar PM2 para producción
npm install -g pm2
pm2 start app_enhanced.js --name "carnivalito-pro"
pm2 startup
pm2 save
```

### Con Docker (Alternativo)
```bash
# Dockerfile incluido
docker build -t carnivalito-pro .
docker run -d -p 3000:3000 --env-file .env carnivalito-pro
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Changelog

### v2.0.0 (Actual)
- ✅ Memoria conversacional persistente
- ✅ Análisis poético avanzado
- ✅ Panel de administración completo
- ✅ Sistema de seguridad reforzado
- ✅ APIs múltiples con fallback
- ✅ UI/UX mejorada con tema gaditano

### v1.0.0
- ✅ Chat básico con IA
- ✅ Reconocimiento de voz
- ✅ Sistema de votos simple

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 👥 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/carnivalito-pro-elite/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/tu-usuario/carnivalito-pro-elite/wiki)
- **Email**: carnivalito.pro@example.com

## 🎉 Agradecimientos

- Groq por su increíble API de LLM
- HuggingFace por los modelos open source
- La comunidad carnavalera gaditana
- Cádiz CF por la inspiración

---

**¡Viva el Carnaval de Cádiz y viva el Cádiz CF! 🎭⚽**

*Hecho con ❤️ en la tacita de plata*
