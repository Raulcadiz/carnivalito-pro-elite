const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🎭 CONFIGURACIÓN GADITANA
const PUERTO = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 🔧 CONFIGURACIÓN DE SEGURIDAD OPTIMIZADA
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://texttospeech.googleapis.com", "wss:"]
        }
    }
}));

// 🌐 CORS GADITANO
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://45.134.226.174:3000',
            'http://45.134.226.174:3001'
        ];
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // En desarrollo permitir todo
        }
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// 🛡️ RATE LIMITING MEJORADO
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Más permisivo para el carnaval
    message: { error: 'Tranquilo miarma, que no es una chirigota de velocidad' },
    keyGenerator: (req) => req.ip || 'unknown'
});

app.use('/api/', limiter);

// 📝 MIDDLEWARE
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// 🎭 DICCIONARIO GADITANO EXPANDIDO
const DICCIONARIO_GADITANO = {
    palabras: [
        { word: 'chiquillo', meaning: 'niño o persona joven, usado cariñosamente' },
        { word: 'jartible', meaning: 'pesado o insistente, pero con arte' },
        { word: 'bastinazo', meaning: 'golpe fuerte o algo exagerado, típico de Cádiz' },
        { word: 'antié', meaning: 'antes de ayer, pa no decirlo largo' },
        { word: 'guachimán', meaning: 'vigilante o que está al loro' },
        { word: 'percal', meaning: 'situación complicada o jaleo' },
        { word: 'fino', meaning: 'listo, con arte, o buen vino de Jerez' },
        { word: 'zambombazo', meaning: 'noticia o suceso impactante, como un cuplé' },
        { word: 'miarma', meaning: 'mi alma, expresión cariñosa gaditana' },
        { word: 'dellazo', meaning: 'algo impresionante o fenomenal' },
        { word: 'detrás', meaning: 'detrá, como decimos en Cai' },
        { word: 'pescaíto', meaning: 'pescadito frito, manjar gaditano' },
        { word: 'jartá', meaning: 'mucho, abundante' },
        { word: 'chocá', meaning: 'borrachera o estar alegre' },
        { word: 'pisha', meaning: 'chaval, muchacho' },
        { word: 'preba', meaning: 'prueba, pero en gaditano' },
        { word: 'bajini', meaning: 'en voz baja, disimuladamente' }
    ],
    frases: [
        { phrase: '¡La que estás liando, chiquillo!', context: 'pa cuando alguien arma un follón con arte' },
        { phrase: 'Esto es Carnaval, esto es Carnaval...', context: 'cántico del Falla en el COAC' },
        { phrase: 'Qué bonito, qué bonito. Qué bonito está mi Cai', context: 'pa alabar Cádiz' },
        { phrase: '¡Viva er peta, viva er peta, que no se meta!', context: 'grito carnavalero pa animar' },
        { phrase: '¡Cai, Cai, no te vayas de Cai!', context: 'pa expresar amor por Cádiz' },
        { phrase: '¡Qué jartura, compadre!', context: 'cuando algo es demasiado, pero con guasa' },
        { phrase: '¡Illo que arte tienes!', context: 'pa alabar a alguien con talento' },
        { phrase: 'Vamos por tanguillos', context: 'cuando algo va bien y con ritmo' },
        { phrase: 'Menudo desbarre', context: 'cuando alguien se equivoca pero con gracia' },
        { phrase: '¡A la plaza de las flores!', context: 'expresión gaditana de alegría' }
    ]
};

// 🎪 PERSONALIDADES CARNAVALERAS
const PERSONALIDADES_COAC = [
    { nombre: 'Antonio Martínez Ares', tipo: 'autor legendario', especialidad: 'cuplés históricos' },
    { nombre: 'Los Millonarios', tipo: 'comparsa legendaria', año: '1979', director: 'Paco Alba' },
    { nombre: 'Los Carapapas', tipo: 'chirigota histórica', especialidad: 'humor fino' },
    { nombre: 'Los Duendes de Cádiz', tipo: 'comparsa mística', director: 'Juan Carlos Aragón' },
    { nombre: 'La Santa Cecilia', tipo: 'coro tradicional', especialidad: 'voces angelicales' },
    { nombre: 'Los Piratas', tipo: 'comparsa aventurera', director: 'Kike Remolino' }
];

// 🎵 ESTILOS MUSICALES DEL COAC
const ESTILOS_COAC = ['tanguillos', 'alegrías', 'pasodobles', 'cuplés', 'popurrí'];

// 🎭 SISTEMA DE IA CARNAVALERA
class CarnavalitoIA {
    constructor() {
        this.personalidad = 'gaditano_auténtico';
        this.conocimiento = DICCIONARIO_GADITANO;
        this.humor = 'fino_pero_pícaro';
    }

    procesarMensaje(mensaje) {
        const msgLower = mensaje.toLowerCase();
        
        // Detectar preguntas sobre el COAC
        if (msgLower.includes('coac') || msgLower.includes('carnaval') || msgLower.includes('falla')) {
            return this.responderCOAC(mensaje);
        }
        
        // Detectar solicitud de poesía
        if (msgLower.includes('poesía') || msgLower.includes('poesia') || msgLower.includes('versos') || msgLower.includes('cuplé')) {
            return this.crearPoesia(mensaje);
        }
        
        // Detectar palabras gaditanas
        const palabraGaditana = this.conocimiento.palabras.find(p => 
            msgLower.includes(p.word.toLowerCase())
        );
        
        if (palabraGaditana) {
            return this.explicarPalabraGaditana(palabraGaditana);
        }
        
        return this.respuestaGeneral(mensaje);
    }

    responderCOAC(mensaje) {
        const respuestas = [
            "¡El COAC es lo más grande que tiene Cai, miarma! En el Falla se vive la magia del Carnaval.",
            "¿Del Concurso? ¡Illo qué arte! Ahí es donde nacen las letras que luego cantamos todo el año.",
            "El Teatro Falla es nuestro templo, chiquillo. Ahí se consagran los maestros del Carnaval.",
            "¡Esto es Carnaval, esto es Carnaval! Como dice el cántico del Falla, ¿verdá?"
        ];
        
        return {
            mensaje: respuestas[Math.floor(Math.random() * respuestas.length)],
            tipo: 'coac',
            personalidad: this.determinarPersonalidad(),
            acento: 'gaditano'
        };
    }

    crearPoesia(tema) {
        const estilos = ['tanguillos', 'alegrías', 'cuplé', 'pasodoble'];
        const estiloElegido = estilos[Math.floor(Math.random() * estilos.length)];
        
        const versos = this.generarVersos(tema, estiloElegido);
        
        return {
            mensaje: `Te voy a cantar unos ${estiloElegido}, miarma:\n\n${versos}`,
            tipo: 'poesia',
            estilo: estiloElegido,
            versos: versos.split('\n'),
            personalidad: this.determinarPersonalidad(),
            cantar: true
        };
    }

    generarVersos(tema, estilo) {
        const versosBase = {
            tanguillos: [
                "En Cádiz la tacita de plata,",
                "donde el Carnaval nunca se mata,",
                "cantamos con arte y con gana,",
                "porque somos la perla gaditana."
            ],
            alegrías: [
                "¡Qué bonito está mi Cai!",
                "Con sus calles y su mar,",
                "donde el viento trae historias",
                "que nos hacen suspirar."
            ],
            cuplé: [
                "Dicen por ahí,",
                "que en Cádiz no hay dolor,",
                "porque aquí miarma,",
                "todo se cura con humor."
            ]
        };
        
        return versosBase[estilo] ? versosBase[estilo].join('\n') : versosBase.tanguillos.join('\n');
    }

    explicarPalabraGaditana(palabra) {
        return {
            mensaje: `¡Ah, "${palabra.word}"! ${palabra.meaning}. Esa palabra es puro Cái, chiquillo.`,
            tipo: 'diccionario',
            palabra: palabra.word,
            significado: palabra.meaning,
            personalidad: this.determinarPersonalidad()
        };
    }

    respuestaGeneral(mensaje) {
        const respuestas = [
            "¡Illo qué arte tienes preguntando! Cuenta, cuenta...",
            "Miarma, en Cái todo tiene su explicación. ¿Qué necesitas saber?",
            "¡Venga va! Que soy to oídos, como buen gaditano.",
            "Chiquillo, pregunta lo que quieras del Carnaval o de Cái."
        ];
        
        return {
            mensaje: respuestas[Math.floor(Math.random() * respuestas.length)],
            tipo: 'general',
            personalidad: this.determinarPersonalidad()
        };
    }

    determinarPersonalidad() {
        const personalidades = [
            { nombre: 'Jorge', voz: 'es-ES-Standard-B', tono: 'grave', acento: 'andaluz_suave' },
            { nombre: 'Pablo', voz: 'es-ES-Standard-D', tono: 'medio_grave', acento: 'gaditano' }
        ];
        
        return personalidades[Math.floor(Math.random() * personalidades.length)];
    }
}

const carnavalitoIA = new CarnavalitoIA();

// 🎭 RUTAS DE LA API

// Chat principal
app.post('/api/chat', (req, res) => {
    try {
        const { message } = req.body;
        const respuesta = carnavalitoIA.procesarMensaje(message);
        
        // Emitir a sockets conectados
        io.emit('nueva_respuesta', respuesta);
        
        res.json({
            success: true,
            response: respuesta.mensaje,
            data: respuesta
        });
    } catch (error) {
        console.error('Error en chat:', error);
        res.status(500).json({
            error: 'Error procesando mensaje',
            message: 'Tranquilo miarma, que enseguida lo arreglamos'
        });
    }
});

// Generar poesía específica
app.post('/api/poetry', (req, res) => {
    try {
        const { tema, estilo } = req.body;
        const poesia = carnavalitoIA.crearPoesia(`${tema} en ${estilo || 'tanguillos'}`);
        
        res.json({
            success: true,
            poetry: poesia.versos,
            estilo: poesia.estilo,
            cantar: true,
            voz: poesia.personalidad
        });
    } catch (error) {
        res.status(500).json({ error: 'Error creando poesía' });
    }
});

// Diccionario gaditano
app.get('/api/diccionario', (req, res) => {
    res.json({
        success: true,
        diccionario: DICCIONARIO_GADITANO
    });
});

// Búsqueda en diccionario
app.get('/api/diccionario/:palabra', (req, res) => {
    const palabra = req.params.palabra.toLowerCase();
    const encontrada = DICCIONARIO_GADITANO.palabras.find(p => 
        p.word.toLowerCase() === palabra
    );
    
    if (encontrada) {
        res.json({ success: true, palabra: encontrada });
    } else {
        res.json({ 
            success: false, 
            message: `"${palabra}" no está en mi diccionario gaditano, chiquillo` 
        });
    }
});

// Trivia del COAC
app.get('/api/trivia', (req, res) => {
    const preguntas = [
        {
            pregunta: "¿En qué año ganaron Los Millonarios su primer COAC?",
            opciones: ["1979", "1980", "1981", "1978"],
            correcta: 0,
            explicacion: "Los Millonarios ganaron en 1979 con Paco Alba"
        },
        {
            pregunta: "¿Cómo se llama el teatro donde se celebra el COAC?",
            opciones: ["Teatro Principal", "Teatro Falla", "Teatro Real", "Teatro Gaditano"],
            correcta: 1,
            explicacion: "El Teatro Falla es el templo del Carnaval gaditano"
        },
        {
            pregunta: "¿Cuántas modalidades hay en el COAC?",
            opciones: ["3", "4", "5", "6"],
            correcta: 1,
            explicacion: "Hay 4 modalidades: Chirigota, Comparsa, Cuarteto y Coro"
        }
    ];
    
    const preguntaAleatoria = preguntas[Math.floor(Math.random() * preguntas.length)];
    res.json({ success: true, trivia: preguntaAleatoria });
});

// Síntesis de voz gaditana
app.post('/api/speak', (req, res) => {
    try {
        const { text, voice = 'Jorge', speed = 0.8 } = req.body;
        
        // Aquí integrarías con Google Text-to-Speech
        // Por ahora devolvemos configuración
        res.json({
            success: true,
            config: {
                text: text,
                voice: voice === 'Jorge' ? 'es-ES-Standard-B' : 'es-ES-Standard-D',
                speed: speed,
                pitch: -2.0, // Más grave para sonar gaditano
                acento: 'andaluz'
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error generando voz' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        servidor: 'Carnavalito Supremo',
        version: '2.0.0',
        diccionario: DICCIONARIO_GADITANO.palabras.length + ' palabras gaditanas',
        timestamp: new Date().toISOString()
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Tranquilo miarma, que esto lo arreglamos enseguida'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        message: 'Esto no está por aquí, chiquillo'
    });
});

// 🚀 INICIAR SERVIDOR
server.listen(PUERTO, HOST, () => {
    console.log(`
🎭 ════════════════════════════════════════════════════════════════════
   ¡¡¡ CARNAVALITO SUPREMO - VERSIÓN GADITANA DELUXE !!!
🎭 ════════════════════════════════════════════════════════════════════
🌐 URL: http://${HOST}:${PUERTO}
📱 Local: http://localhost:${PUERTO}
🎪 Diccionario: ${DICCIONARIO_GADITANO.palabras.length} palabras gaditanas
🎵 Estilos: ${ESTILOS_COAC.join(', ')}
🎭 Personalidades: Jorge & Pablo (voces graves gaditanas)
🔧 Estado: FUNCIONANDO CON ARTE
🎉 ¡¡¡ VIVA EL CARNAVAL DE CÁDIZ !!!
🎭 ════════════════════════════════════════════════════════════════════
    `);
});

// WebSocket para tiempo real
io.on('connection', (socket) => {
    console.log('🎭 Usuario conectado al Carnavalito');
    
    socket.emit('bienvenida', {
        mensaje: '¡Bienvenido al Carnavalito, miarma! 🎭',
        personalidades: ['Jorge', 'Pablo'],
        diccionario: DICCIONARIO_GADITANO.palabras.length
    });
    
    socket.on('disconnect', () => {
        console.log('🎭 Usuario desconectado');
    });
});

module.exports = { app, server };
