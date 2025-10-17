// 🎭 CARNAVALITO SUPREMO - JAVASCRIPT AVANZADO
// Sistema completo de IA, voz y efectos carnavaleros

class CarnavalitoSupremo {
    constructor() {
        this.apiBase = window.location.origin;
        this.socket = null;
        this.vozActual = 'Jorge';
        this.ultimaRespuesta = '';
        this.efectosActivos = true;
        this.modoCarnaval = true;
        
        // 🎵 Configuración de voces gaditanas
        this.vocesGaditanas = {
            Jorge: {
                google: 'es-ES-Wavenet-B',
                browser: 'Google español',
                pitch: -2.0,
                speed: 0.8,
                acento: 'gaditano_grave'
            },
            Pablo: {
                google: 'es-ES-Wavenet-D', 
                browser: 'Microsoft Pablo',
                pitch: -1.0,
                speed: 0.85,
                acento: 'gaditano_medio'
            }
        };
        
        // 🎪 Efectos visuales
        this.efectosVisuales = {
            confeti: true,
            personajes: true,
            mascaras: true,
            instrumentos: true
        };
        
        this.init();
    }
    
    async init() {
        console.log('🎭 Inicializando Carnavalito Supremo...');
        
        this.setupDOM();
        this.setupSocket();
        this.setupSpeech();
        this.startVisualEffects();
        this.preloadSounds();
        
        // Mostrar entrada espectacular
        setTimeout(() => {
            this.mostrarEntradaEspectacular();
        }, 500);
        
        console.log('✅ Carnavalito Supremo inicializado completamente');
    }
    
    // 🎨 CONFIGURACIÓN DOM
    setupDOM() {
        // Elementos principales
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            loading: document.getElementById('loading'),
            btnJorge: document.getElementById('btnJorge'),
            btnPablo: document.getElementById('btnPablo'),
            btnCantar: document.getElementById('btnCantar')
        };
        
        // Event listeners
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.enviarMensaje();
            }
        });
        
        this.elements.sendButton.addEventListener('click', () => this.enviarMensaje());
        this.elements.btnJorge.addEventListener('click', () => this.cambiarVoz('Jorge'));
        this.elements.btnPablo.addEventListener('click', () => this.cambiarVoz('Pablo'));
        this.elements.btnCantar.addEventListener('click', () => this.cantarUltimaRespuesta());
        
        // Efectos en el escudo del Hércules
        const escudo = document.querySelector('.escudo-hercules');
        if (escudo) {
            escudo.addEventListener('click', () => this.efectoEscudoHercules());
        }
    }
    
    // 🔌 SOCKET SETUP
    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🎭 Conectado al servidor Carnavalito');
            this.mostrarNotificacion('¡Conectado al Carnavalito!', 'success');
        });
        
        this.socket.on('bienvenida', (data) => {
            console.log('🎉 Bienvenida:', data);
        });
        
        this.socket.on('nueva_respuesta', (respuesta) => {
            if (respuesta.cantar && this.modoCarnaval) {
                setTimeout(() => {
                    this.hablarTexto(respuesta.mensaje, respuesta.personalidad);
                }, 1000);
            }
        });
        
        this.socket.on('disconnect', () => {
            this.mostrarNotificacion('Conexión perdida', 'warning');
        });
    }
    
    // 🎤 CONFIGURACIÓN DE VOZ
    setupSpeech() {
        // Verificar soporte de Speech Synthesis
        if ('speechSynthesis' in window) {
            this.speechSupported = true;
            
            // Cargar voces disponibles
            speechSynthesis.onvoiceschanged = () => {
                this.voicesLoaded = true;
                this.availableVoices = speechSynthesis.getVoices();
                console.log('🎤 Voces cargadas:', this.availableVoices.length);
            };
        } else {
            console.warn('⚠️ Speech Synthesis no soportado');
            this.speechSupported = false;
        }
        
        // Configurar reconocimiento de voz si está disponible
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.setupSpeechRecognition();
        }
    }
    
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = 'es-ES';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.messageInput.value = transcript;
            this.mostrarNotificacion('Texto reconocido: ' + transcript, 'info');
        };
        
        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
        };
        
        // Agregar botón de micrófono
        this.addMicrophoneButton();
    }
    
    addMicrophoneButton() {
        const micButton = document.createElement('button');
        micButton.className = 'btn-voz';
        micButton.innerHTML = '🎤 Escuchar';
        micButton.onclick = () => this.startListening();
        
        const controlesVoz = document.querySelector('.controles-voz');
        if (controlesVoz) {
            controlesVoz.appendChild(micButton);
        }
    }
    
    startListening() {
        if (this.recognition) {
            this.recognition.start();
            this.mostrarNotificacion('Escuchando...', 'info');
        }
    }
    
    // 🎪 EFECTOS VISUALES
    startVisualEffects() {
        if (!this.efectosActivos) return;
        
        // Confeti continuo
        setInterval(() => {
            if (this.efectosVisuales.confeti) {
                this.crearConfeti();
            }
        }, 3000);
        
        // Personajes carnavaleros flotantes
        setInterval(() => {
            if (this.efectosVisuales.personajes) {
                this.crearPersonajeFlotante();
            }
        }, 8000);
        
        // Máscaras flotantes
        setInterval(() => {
            if (this.efectosVisuales.mascaras) {
                this.crearMascaraFlotante();
            }
        }, 12000);
        
        // Instrumentos musicales
        setInterval(() => {
            if (this.efectosVisuales.instrumentos) {
                this.crearInstrumentoMusical();
            }
        }, 15000);
        
        // Pétalos ocasionales
        setInterval(() => {
            this.crearLluviaPetalos();
        }, 20000);
    }
    
    crearConfeti() {
        const container = document.getElementById('confetti-container') || document.body;
        const tipos = ['papel', 'serpentina', 'estrella'];
        const colores = ['#FFD700', '#dc2626', '#1e3a8a', '#059669', '#ff6f00'];
        
        for (let i = 0; i < 6; i++) {
            const confeti = document.createElement('div');
            confeti.className = `confetti ${tipos[Math.floor(Math.random() * tipos.length)]}`;
            confeti.style.left = Math.random() * 100 + '%';
            confeti.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
            confeti.style.animationDuration = (Math.random() * 4 + 3) + 's';
            confeti.style.animationDelay = Math.random() * 2 + 's';
            
            container.appendChild(confeti);
            
            setTimeout(() => {
                if (confeti.parentNode) {
                    confeti.parentNode.removeChild(confeti);
                }
            }, 7000);
        }
    }
    
    crearPersonajeFlotante() {
        const personajes = ['🎭', '🎪', '🎨', '🎵', '🎺', '🥁', '🎸', '🎻'];
        const personaje = document.createElement('div');
        personaje.className = `personaje-carnaval tipo${Math.floor(Math.random() * 3) + 1}`;
        personaje.textContent = personajes[Math.floor(Math.random() * personajes.length)];
        personaje.style.top = Math.random() * 60 + 20 + '%';
        
        document.body.appendChild(personaje);
        
        setTimeout(() => {
            if (personaje.parentNode) {
                personaje.parentNode.removeChild(personaje);
            }
        }, 20000);
    }
    
    crearMascaraFlotante() {
        const mascaras = ['🎭', '👺', '🎪', '🤡', '👑'];
        const mascara = document.createElement('div');
        mascara.className = 'mascara-carnaval';
        mascara.textContent = mascaras[Math.floor(Math.random() * mascaras.length)];
        mascara.style.left = Math.random() * 90 + 5 + '%';
        mascara.style.top = Math.random() * 80 + 10 + '%';
        
        document.body.appendChild(mascara);
        
        setTimeout(() => {
            if (mascara.parentNode) {
                mascara.parentNode.removeChild(mascara);
            }
        }, 15000);
    }
    
    crearInstrumentoMusical() {
        const instrumentos = ['🎺', '🥁', '🎸', '🎻', '🎷', '🪕', '🎹'];
        const instrumento = document.createElement('div');
        instrumento.className = 'instrumento-musical';
        instrumento.textContent = instrumentos[Math.floor(Math.random() * instrumentos.length)];
        instrumento.style.left = Math.random() * 80 + 10 + '%';
        instrumento.style.top = Math.random() * 70 + 15 + '%';
        
        document.body.appendChild(instrumento);
        
        setTimeout(() => {
            if (instrumento.parentNode) {
                instrumento.parentNode.removeChild(instrumento);
            }
        }, 12000);
    }
    
    crearLluviaPetalos() {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const petalo = document.createElement('div');
                petalo.className = 'petalo';
                petalo.style.left = Math.random() * 100 + '%';
                petalo.style.animationDelay = Math.random() * 2 + 's';
                
                // Colores aleatorios de pétalos
                const colores = ['#FFD700', '#ff6f00', '#d32f2f', '#1976d2'];
                petalo.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
                
                document.body.appendChild(petalo);
                
                setTimeout(() => {
                    if (petalo.parentNode) {
                        petalo.parentNode.removeChild(petalo);
                    }
                }, 8000);
            }, i * 200);
        }
    }
    
    // 💬 FUNCIONES DE CHAT
    async enviarMensaje() {
        const mensaje = this.elements.messageInput.value.trim();
        if (!mensaje) return;
        
        // Agregar mensaje del usuario
        this.agregarMensaje(mensaje, 'user');
        this.elements.messageInput.value = '';
        
        // Mostrar loading
        this.mostrarLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: mensaje })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.ultimaRespuesta = data.response;
                this.agregarMensaje(data.response, 'bot');
                
                // Efectos según el tipo de respuesta
                this.manejarEfectosPorTipo(data.data);
                
                // Hablar automáticamente si está habilitado
                if (data.data.personalidad && this.modoCarnaval) {
                    setTimeout(() => {
                        this.hablarTexto(data.response, data.data.personalidad);
                    }, 800);
                }
                
            } else {
                this.agregarMensaje('Lo siento miarma, ha habido un problemilla técnico', 'bot');
            }
            
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            this.agregarMensaje('No puedo conectar ahora mismo, chiquillo. ¡Prueba en un ratito!', 'bot');
            this.mostrarEfectoEspecial('❌🔧');
        } finally {
            this.mostrarLoading(false);
        }
    }
    
    manejarEfectosPorTipo(data) {
        switch (data.tipo) {
            case 'poesia':
                this.mostrarEfectoEspecial('🎵✨📝');
                this.reproducirSonido('audioAplauso');
                this.activarPulsoMusical(data.estilo || 'tanguillos');
                break;
                
            case 'coac':
                this.mostrarEfectoEspecial('🏆🎭🎪');
                this.crearOndaSonido();
                break;
                
            case 'diccionario':
                this.mostrarEfectoEspecial('📚💡');
                break;
                
            default:
                this.mostrarEfectoEspecial('🎭💬');
        }
    }
    
    agregarMensaje(texto, tipo) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${tipo}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = tipo === 'bot' ? '🎭' : '👤';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = texto;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        // Animación de entrada
        messageDiv.classList.add('entrada-espectacular');
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        
        // Efecto de typing si es bot
        if (tipo === 'bot') {
            this.efectoTyping(content, texto);
        }
    }
    
    efectoTyping(element, texto) {
        element.textContent = '';
        let i = 0;
        
        const escribir = () => {
            if (i < texto.length) {
                element.textContent += texto.charAt(i);
                i++;
                setTimeout(escribir, 30);
            }
        };
        
        escribir();
    }
    
    // 🎤 FUNCIONES DE VOZ
    cambiarVoz(voz) {
        this.vozActual = voz;
        this.mostrarNotificacion(`Voz cambiada a ${voz}`, 'success');
        this.mostrarEfectoEspecial('🎤🔄');
        
        // Actualizar botones
        document.querySelectorAll('.btn-voz').forEach(btn => {
            btn.classList.remove('activo');
        });
        
        const btnActivo = voz === 'Jorge' ? this.elements.btnJorge : this.elements.btnPablo;
        btnActivo.classList.add('activo');
    }
    
    async hablarTexto(texto, personalidad = null) {
        if (!this.speechSupported) {
            console.warn('Speech synthesis no disponible');
            return;
        }
        
        try {
            // Limpiar texto para mejor pronunciación gaditana
            let textoLimpio = this.adaptarTextoGaditano(texto);
            
            const utterance = new SpeechSynthesisUtterance(textoLimpio);
            
            // Configurar voz
            const configVoz = this.vocesGaditanas[this.vozActual];
            
            // Buscar mejor voz disponible
            if (this.voicesLoaded && this.availableVoices.length > 0) {
                const vozEspanola = this.availableVoices.find(voice => 
                    voice.lang.includes('es-ES') && 
                    (voice.name.includes('Google') || voice.name.includes('Microsoft'))
                ) || this.availableVoices.find(voice => voice.lang.includes('es'));
                
                if (vozEspanola) {
                    utterance.voice = vozEspanola;
                }
            }
            
            // Configurar parámetros para sonar gaditano
            utterance.rate = configVoz.speed;
            utterance.pitch = configVoz.pitch / 10; // Normalizar para browser
            utterance.volume = 0.9;
            
            // Eventos
            utterance.onstart = () => {
                this.crearOndaSonido();
                this.mostrarEfectoEspecial('🎤🔊');
            };
            
            utterance.onend = () => {
                console.log('🎤 Reproducción de voz completada');
            };
            
            utterance.onerror = (error) => {
                console.error('Error en síntesis de voz:', error);
            };
            
            // Reproducir
            speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('Error hablando texto:', error);
        }
    }
    
    adaptarTextoGaditano(texto) {
        // Adaptaciones para pronunciación gaditana
        return texto
            .replace(/pescadito/g, 'pescaíto')
            .replace(/mira/g, 'mía')
            .replace(/para/g, 'pa')
            .replace(/madre/g, 'mare')
            .replace(/padre/g, 'pare')
            .replace(/ahora/g, 'aora')
            .replace(/después/g, 'despué')
            .replace(/antes/g, 'ante')
            .replace(/detrás/g, 'detrá');
    }
    
    cantarUltimaRespuesta() {
        if (!this.ultimaRespuesta) {
            this.mostrarNotificacion('No hay mensaje para cantar', 'warning');
            return;
        }
        
        // Convertir a formato cantado
        const textoCantado = this.ultimaRespuesta
            .replace(/\./g, ' 🎵.')
            .replace(/,/g, ' 🎶,')
            .replace(/!/g, ' 🎵!')
            .replace(/\?/g, ' 🎶?');
        
        this.hablarTexto(textoCantado);
        this.mostrarEfectoEspecial('🎵🎤🎭');
        this.activarPulsoMusical('tanguillos');
        this.reproducirSonido('audioAplauso');
    }
    
    // 🎪 EFECTOS ESPECIALES
    mostrarEfectoEspecial(emoji) {
        const efecto = document.createElement('div');
        efecto.className = 'efecto-carnaval';
        efecto.textContent = emoji;
        document.body.appendChild(efecto);
        
        setTimeout(() => {
            if (efecto.parentNode) {
                efecto.parentNode.removeChild(efecto);
            }
        }, 2000);
    }
    
    crearOndaSonido() {
        const onda = document.createElement('div');
        onda.className = 'onda-sonido';
        onda.style.left = '50%';
        onda.style.top = '50%';
        onda.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(onda);
        
        setTimeout(() => {
            if (onda.parentNode) {
                onda.parentNode.removeChild(onda);
            }
        }, 2000);
    }
    
    activarPulsoMusical(estilo) {
        const elementos = document.querySelectorAll('.chat-container, .panel-lateral');
        elementos.forEach(el => {
            el.classList.add('pulso-musical', estilo);
            setTimeout(() => {
                el.classList.remove('pulso-musical', estilo);
            }, 3000);
        });
    }
    
    efectoEscudoHercules() {
        this.mostrarEfectoEspecial('🦁⚽🏆');
        this.reproducirSonido('audioCarnaval');
        this.crearLluviaPetalos();
        
        // Mensaje especial del Hércules
        setTimeout(() => {
            this.agregarMensaje('¡Viva er Hércules de Cái! ⚽🦁', 'bot');
        }, 1000);
    }
    
    mostrarEntradaEspectacular() {
        const elementos = document.querySelectorAll('.chat-container, .panel-lateral, .header-carnaval');
        elementos.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('entrada-espectacular');
            }, index * 200);
        });
        
        this.mostrarEfectoEspecial('🎭✨🎪');
        this.crearConfeti();
    }
    
    // 🔊 AUDIO
    preloadSounds() {
        // Precargar sonidos si existen
        this.sounds = {
            carnaval: document.getElementById('audioCarnaval'),
            aplauso: document.getElementById('audioAplauso')
        };
    }
    
    reproducirSonido(soundId) {
        try {
            const audio = document.getElementById(soundId);
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(e => console.log('No se pudo reproducir:', e));
            }
        } catch (error) {
            console.log('Error reproduciendo sonido:', error);
        }
    }
    
    // 🔔 NOTIFICACIONES
    mostrarNotificacion(mensaje, tipo = 'info') {
        const colores = {
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c',
            info: '#3498db'
        };
        
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colores[tipo]};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            font-family: 'Fredoka', cursive;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notif.textContent = mensaje;
        
        document.body.appendChild(notif);
        
        setTimeout(() => notif.style.transform = 'translateX(0)', 100);
        
        setTimeout(() => {
            notif.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            }, 300);
        }, 3000);
    }
    
    mostrarLoading(mostrar) {
        this.elements.loading.classList.toggle('active', mostrar);
        this.elements.sendButton.disabled = mostrar;
    }
}

// 🎭 FUNCIONES GLOBALES PARA COMPATIBILIDAD
let carnavalitoApp;

// Funciones rápidas para botones
function enviarMensajeRapido(mensaje) {
    if (carnavalitoApp) {
        carnavalitoApp.elements.messageInput.value = mensaje;
        carnavalitoApp.enviarMensaje();
    }
}

function enviarPalabraRapida(palabra) {
    enviarMensajeRapido(`¿Qué significa ${palabra}?`);
}

async function trivia() {
    try {
        const response = await fetch('/api/trivia');
        const data = await response.json();
        
        if (data.success && carnavalitoApp) {
            const pregunta = data.trivia;
            let mensaje = `🧠 TRIVIA DEL COAC:\n\n${pregunta.pregunta}\n\n`;
            pregunta.opciones.forEach((opcion, index) => {
                mensaje += `${index + 1}. ${opcion}\n`;
            });
            
            carnavalitoApp.agregarMensaje(mensaje, 'bot');
            carnavalitoApp.mostrarEfectoEspecial('🧠🎭❓');
        }
    } catch (error) {
        console.error('Error en trivia:', error);
    }
}

// 🚀 INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    carnavalitoApp = new CarnavalitoSupremo();
    console.log('🎭 ¡Carnavalito Supremo cargado! ¡Viva er Carnaval de Cái!');
});

// 🎪 EXPORTAR PARA MÓDULOS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CarnavalitoSupremo };
}
