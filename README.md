# 🎭 CARNAVALITO SUPREMO

**El chat más gaditano de toda Cái - Con arte, gracia y mucho COAC**

[![Versión](https://img.shields.io/badge/versión-2.0.0-gold)](https://github.com/tu-usuario/carnavalito-supremo)
[![Cádiz](https://img.shields.io/badge/Made%20in-Cádiz-blue)](https://cadiz.es)
[![Carnaval](https://img.shields.io/badge/COAC-2024-red)](https://carnavaldecadiz.com)

## 🎪 ¿Qué es Carnavalito Supremo?

Carnavalito Supremo es la evolución más gaditana del chat carnavalero. Un asistente de IA que habla como un verdadero gaditano, conoce todo el COAC, recita poesías, canta tanguillos y está lleno de efectos visuales del Carnaval de Cádiz.

### ✨ Características Principales

- 🎭 **IA Gaditana Auténtica**: Habla como un verdadero gaditano, no sevillano
- 🎤 **Voces Graves**: Jorge y Pablo con acento gaditano auténtico
- 🎵 **Canta y Recita**: Tanguillos, alegrías, cuplés y pasodobles
- 🎪 **Efectos Carnavaleros**: Confeti, serpentinas, personajes flotantes
- 🏛️ **Escudo del Hércules**: Con leones animados en el centro
- 📚 **Diccionario Gaditano**: 50+ palabras y frases típicas de Cái
- 🏆 **Experto en COAC**: Conoce modalidades, historia y agrupaciones
- 🎨 **Diseño Premium**: Colores de Cádiz, efectos dorados y animaciones

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/carnavalito-supremo.git
cd carnavalito-supremo

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar el servidor
npm start
```

**¡Listo miarma!** 🎭 Tu Carnavalito estará disponible en `http://localhost:3001`

## 🎯 Requisitos del Sistema

- **Node.js**: >= 16.0.0
- **NPM**: >= 8.0.0
- **Navegador**: Chrome, Firefox, Safari, Edge (con soporte para Speech API)
- **Sistema**: Windows, macOS, Linux

## 🎪 Funcionalidades Avanzadas

### 🎤 Sistema de Voz Gaditana

- **Jorge**: Voz grave y pausada, perfecto para cuplés
- **Pablo**: Voz media-grave, ideal para tanguillos
- **Configuración**: Pitch personalizable, velocidad adaptada
- **Pronunciación**: Adaptada al acento gaditano auténtico

### 🎭 Diccionario Gaditano

El Carnavalito conoce estas palabras típicas:

| Palabra | Significado |
|---------|-------------|
| **chiquillo** | niño o persona joven, usado cariñosamente |
| **miarma** | mi alma, expresión cariñosa gaditana |
| **jartible** | pesado o insistente, pero con arte |
| **bastinazo** | golpe fuerte o algo exagerado, típico de Cádiz |
| **fino** | listo, con arte, o buen vino de Jerez |

### 🎵 Estilos Musicales

- **Tanguillos**: Ritmo alegre y festivo
- **Alegrías**: Cante flamenco gaditano
- **Pasodobles**: Música de presentación
- **Cuplés**: Piezas humorísticas y críticas
- **Popurrí**: Mezcla de estilos

### 🎪 Efectos Visuales

- **Confeti Continuo**: Papelillos dorados cayendo
- **Serpentinas**: Efectos rojos del Hércules
- **Personajes Flotantes**: Máscaras e instrumentos
- **Lluvia de Pétalos**: Efectos especiales del carnaval
- **Escudo Animado**: Hércules con leones danzantes

## 🛠️ Configuración Avanzada

### Variables de Entorno

```env
# Configuración básica
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Voces gaditanas
VOZ_JORGE_PITCH=-2.0
VOZ_PABLO_SPEED=0.8

# Efectos visuales
CONFETI_ENABLED=true
PERSONAJES_FLOTANTES=true
ESCUDO_HERCULES_ANIMADO=true
```

### Integración con Google Text-to-Speech

```bash
# 1. Crear proyecto en Google Cloud
# 2. Habilitar Text-to-Speech API
# 3. Crear credenciales de servicio
# 4. Configurar variable de entorno
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
```

## 🎯 API Endpoints

### Chat Principal
```
POST /api/chat
{
  "message": "Cuéntame del COAC"
}
```

### Generar Poesía
```
POST /api/poetry
{
  "tema": "Cádiz",
  "estilo": "tanguillos"
}
```

### Diccionario Gaditano
```
GET /api/diccionario
GET /api/diccionario/chiquillo
```

### Trivia del COAC
```
GET /api/trivia
```

### Síntesis de Voz
```
POST /api/speak
{
  "text": "¡Viva er Carnaval de Cái!",
  "voice": "Jorge",
  "speed": 0.8
}
```

## 🎭 Uso del Chat

### Comandos Rápidos

- **"Cuéntame del COAC"** → Información del concurso
- **"Hazme una poesía"** → Genera versos gaditanos
- **"Cántame tanguillos"** → Recita con música
- **"¿Qué significa [palabra]?"** → Diccionario gaditano
- **"Modalidades del carnaval"** → Explica chirigota, comparsa, etc.

### Botones de Acción

- 🏆 **Sobre el COAC**
- 📝 **Poesía de Cái**
- 🎵 **Tanguillos**
- 🎪 **Modalidades**
- 💬 **Frases típicas**
- 🧠 **Trivia COAC**

## 🎨 Personalización

### Colores de Cádiz

```css
:root {
    --color-oro: #FFD700;
    --color-azul-cadiz: #1e3a8a;
    --color-rojo-hercules: #dc2626;
    --color-verde-mar: #059669;
}
```

### Efectos Personalizables

- Velocidad del confeti
- Frecuencia de personajes flotantes
- Colores del escudo del Hércules
- Animaciones del texto

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm start          # Iniciar servidor
npm run dev        # Desarrollo con nodemon
npm test           # Ejecutar tests
npm run setup      # Configuración inicial
```

### Estructura del Proyecto

```
carnavalito-supremo/
├── server/
│   ├── index.js           # Servidor principal
│   └── routes/            # Rutas de la API
├── public/
│   ├── index.html         # Interfaz principal
│   ├── css/               # Estilos del carnaval
│   ├── js/                # JavaScript avanzado
│   ├── images/            # Imágenes del carnaval
│   └── sounds/            # Sonidos gaditanos
├── data/                  # Base de datos local
├── logs/                  # Archivos de log
└── package.json
```

## 🐛 Solución de Problemas

### Error SSL Protocol
```bash
# Cambiar HTTPS a HTTP en desarrollo
USE_HTTPS=false
```

### Problemas de Voz
```bash
# Verificar permisos del micrófono
# Usar Chrome o Firefox actualizado
```

### Efectos No Aparecen
```bash
# Verificar configuración de efectos
EFECTOS_VISUALES=true
CONFETI_ENABLED=true
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas miarma!

1. Fork del proyecto
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad gaditana'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

### Cómo Agregar Palabras Gaditanas

```javascript
// En server/index.js, agregar a DICCIONARIO_GADITANO
{
    word: 'nueva_palabra',
    meaning: 'significado gaditano'
}
```

## 📝 Licencia

MIT License - Hecho con ❤️ en Cádiz

## 🎭 Créditos

- **Desarrollado**: Con amor para Cádiz
- **Inspirado**: En el Carnaval de Cádiz y el COAC
- **Voces**: Jorge y Pablo (configuración gaditana)
- **Efectos**: Basados en el Teatro Falla
- **Colores**: Oficiales del Hércules CF y Cádiz

## 🌟 Agradecimientos

- A todos los carnavaleros de Cái
- Al Gran Teatro Falla
- A las agrupaciones del COAC
- Al Hércules Club de Fútbol
- A la ciudad más bonita del mundo: **Cádiz**

---

**¡Viva er Carnaval de Cái!** 🎭⚽🏆

*"Esto es Carnaval, esto es Carnaval..."* 🎵
