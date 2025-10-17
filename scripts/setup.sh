#!/bin/bash

# 🎭 CARNAVALITO SUPREMO - SCRIPT DE CONFIGURACIÓN INICIAL

echo "🎭 ═══════════════════════════════════════════════════════════════════"
echo "    ¡¡¡ CONFIGURANDO CARNAVALITO SUPREMO !!!"
echo "    El chat más gaditano de toda Cái"
echo "🎭 ═══════════════════════════════════════════════════════════════════"

# Verificar Node.js
echo "🔍 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "📦 Instálalo desde: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js encontrado: $NODE_VERSION"

# Verificar NPM
echo "🔍 Verificando NPM..."
if ! command -v npm &> /dev/null; then
    echo "❌ NPM no está instalado"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ NPM encontrado: $NPM_VERSION"

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p logs data config sounds/carnaval sounds/effects

# Copiar archivo de configuración
echo "⚙️ Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Archivo .env creado"
else
    echo "ℹ️ Archivo .env ya existe"
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar instalación
if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas correctamente"
else
    echo "❌ Error instalando dependencias"
    exit 1
fi

# Crear archivos de log
echo "📝 Configurando sistema de logs..."
touch logs/carnavalito.log
touch logs/error.log
touch logs/access.log

# Configurar permisos
echo "🔐 Configurando permisos..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod 755 logs data config

# Mensaje final
echo "🎭 ═══════════════════════════════════════════════════════════════════"
echo "    ✅ ¡¡¡ CARNAVALITO SUPREMO CONFIGURADO !!!"
echo ""
echo "🚀 Para iniciar el servidor:"
echo "   npm start"
echo ""
echo "🌐 URL del servidor:"
echo "   http://localhost:3001"
echo ""
echo "🎪 Características habilitadas:"
echo "   ✅ Chat gaditano con IA"
echo "   ✅ Voces Jorge y Pablo (graves)"
echo "   ✅ Efectos visuales del carnaval"
echo "   ✅ Diccionario gaditano (50+ palabras)"
echo "   ✅ Recitar poesías y cantar"
echo "   ✅ Escudo del Hércules animado"
echo "   ✅ Confeti y serpentinas"
echo ""
echo "🎭 ¡¡¡ VIVA ER CARNAVAL DE CÁI !!!"
echo "🎭 ═══════════════════════════════════════════════════════════════════"
