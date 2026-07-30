#!/bin/bash
# Script para sincronizar evidencias después de desplegar
# Ejecutar después de 'npx tsc' y antes de reiniciar PM2

# Copiar evidencias de dist a la carpeta pública correcta
cp -r /opt/backend/dist/public/evidencias/* /opt/backend/public/evidencias/ 2>/dev/null || true

echo "Evidencias sincronizadas"
