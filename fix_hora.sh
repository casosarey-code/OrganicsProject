#!/bin/bash
# Cambiar PlanillaFecha para que sea 06:00:00 del día actual
sed -i "s/PlanillaFecha: new Date(),/PlanillaFecha: new Date(new Date().setHours(6, 0, 0, 0)),/" /opt/backend/src/routes/tareaProgramada.ts

# Verificar
grep -n "PlanillaFecha:" /opt/backend/src/routes/tareaProgramada.ts | head -5
