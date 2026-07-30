#!/bin/bash
sed -i "31s/.*/          orderBy: { EPOrden: 'asc' },/" /opt/backend/src/routes/tareaProgramada.ts
grep -n "orderBy" /opt/backend/src/routes/tareaProgramada.ts | head -5
