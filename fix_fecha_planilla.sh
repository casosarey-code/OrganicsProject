#!/bin/bash
# Agregar función para setear hora a 06:00:00 y usarla en PlanillaFecha

sed -i "s/PlanillaFecha: new Date(),/PlanillaFecha: setFecha6AM(hoy),/" /opt/backend/src/routes/tareaProgramada.ts

# Agregar función setFecha6AM después de la línea "const hoy = new Date();"
sed -i "/const hoy = new Date();/a\\    hoy.setHours(6, 0, 0, 0);\n    const setFecha6AM = (date: Date) => { const d = new Date(date); d.setHours(6, 0, 0, 0); return d; };" /opt/backend/src/routes/tareaProgramada.ts

# Verificar el cambio
grep -n "PlanillaFecha\|setFecha6AM" /opt/backend/src/routes/tareaProgramada.ts | head -10
