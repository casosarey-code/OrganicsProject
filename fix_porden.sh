#!/bin/bash
# Fix 1: Add orderBy EPOrden to empresaProductos query
sed -i 's/include: {/include: {\n          orderBy: { EPOrden: '\''asc'\'' },/' /opt/backend/src/routes/tareaProgramada.ts

# Fix 2: Add PDOrden field to planilla creation
sed -i 's/PDUsuarioReg: userId,/PDUsuarioReg: userId,\n                PDOrden: ep.EPOrden,/' /opt/backend/src/routes/tareaProgramada.ts

# Verify changes
echo "=== Changes in tareaProgramada.ts ==="
grep -n "orderBy\|PDOrden" /opt/backend/src/routes/tareaProgramada.ts | head -10
