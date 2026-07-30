#!/bin/bash
sed -i 's/@@unique(\[PCProducto, PCComponente\])/@@unique([PCProducto, PCComponente, PCEmpresa])/' /opt/backend/prisma/schema.prisma
grep "@@unique" /opt/backend/prisma/schema.prisma
