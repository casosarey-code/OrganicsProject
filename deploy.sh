#!/bin/bash
# =====================================================
# Script de Deploy para Hostinger
# =====================================================

echo "🚀 Iniciando deploy..."

# 1. Instalar dependencias del proyecto raíz
echo "📦 Instalando dependencias..."
npm install

# 2. Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
cd backend
npm install

# 3. Generar Prisma Client
echo "⚙️ Generando Prisma Client..."
npx prisma generate

# 4. Compilar backend (TypeScript → JavaScript)
echo "🔨 Compilando backend..."
npm run build

# 5. Volver al directorio raíz
cd ..

# 6. Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd frontend
npm install

# 7. Compilar frontend (Vite build)
echo "🔨 Compilando frontend..."
npm run build

# 8. Volver al directorio raíz
cd ..

echo "✅ Deploy completado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Copiar frontend/dist a la carpeta pública de Hostinger"
echo "2. Ejecutar 'npm start' en backend para iniciar el servidor"
echo "3. Asegúrate de que el .env en Hostinger tenga las variables correctas"
