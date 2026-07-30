#!/bin/bash
# Script para generar planillas diarias automáticamente
# Ejecutar: bash /opt/backend/generar_planillas.sh

BACKEND_URL="https://dcbsas.com/api"
LOG_FILE="/var/log/generar_planillas.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando generación de planillas..." >> $LOG_FILE

# Obtener token (primero hacer login)
TOKEN=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@organics.com","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: No se pudo obtener token" >> $LOG_FILE
  exit 1
fi

# Ejecutar tarea programada
RESULT=$(curl -s -X POST "$BACKEND_URL/tareas/crear-planillas-masivas" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "$(date '+%Y-%m-%d %H:%M:%S') - Resultado: $RESULT" >> $LOG_FILE

echo "$(date '+%Y-%m-%d %H:%M:%S') - Finalizado" >> $LOG_FILE
