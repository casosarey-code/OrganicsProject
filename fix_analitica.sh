#!/bin/bash
# Eliminar filtro por defecto de estado en analitica

sed -i "s/whereBase.PlanillaEstado = estado || 'D';/if (estado) { whereBase.PlanillaEstado = estado; }/" /opt/backend/src/routes/analitica.ts

# Verificar el cambio
