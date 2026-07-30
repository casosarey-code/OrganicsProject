#!/bin/bash
sed -i "30s/.*/    if (estado) { whereBase.PlanillaEstado = estado; }/" /opt/backend/src/routes/analitica.ts
sed -n 28,32p /opt/backend/src/routes/analitica.ts
