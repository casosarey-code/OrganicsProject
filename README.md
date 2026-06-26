# OrganicsProject - Sistema de Planillas

Sistema full-stack para gestión de planillas con React, Node.js, Express, Prisma y PostgreSQL.

## Estructura del Proyecto

```
OrganicsProject/
├── backend/              # API REST con Node.js + Express
│   ├── prisma/           # Schema de base de datos
│   └── src/
│       ├── config/       # Configuración (DB, JWT)
│       ├── middleware/   # Auth, Roles, Permissions
│       ├── routes/       # Endpoints API
│       ├── services/     # Lógica de negocio
│       └── server.ts     # Entry point
├── frontend/             # Aplicación React
│   └── src/
│       ├── api/          # Llamados HTTP
│       ├── components/   # Componentes reutilizables
│       ├── contexts/     # Contextos React
│       ├── hooks/        # Custom hooks
│       ├── pages/        # Vistas de la aplicación
│       ├── styles/       # Estilos CSS
│       └── types/        # Tipos TypeScript
└── package.json          # Scripts para ambos proyectos
```

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## Instalación

1. **Instalar dependencias de ambos proyectos:**
```bash
npm run install:all
```

2. **Configurar la base de datos:**
```bash
# Crear la base de datos en PostgreSQL
# Asegúrate de que el usuario y contraseña coincidan con .env

# Generar cliente Prisma
npm run prisma:generate

# Aplicar migraciones (crear tablas)
npm run prisma:push
```

3. **Configurar variables de entorno (backend/.env):**
```
DATABASE_URL="postgresql://postgres:kamo1993@localhost:5432/organics?schema=public"
JWT_SECRET="tu-secreto-jwt-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
ENABLE_SCHEDULER=true
FRONTEND_URL=http://localhost:3000
```

## Ejecución

### Desarrollo (ambos proyectos)
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Individual
```bash
# Solo backend
npm run dev:backend

# Solo frontend
npm run dev:frontend
```

## Endpoints API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Perfil del usuario

### Planillas
- `GET /api/planillas` - Listar todas
- `GET /api/planillas/:id` - Ver una
- `POST /api/planillas` - Crear
- `PUT /api/planillas/:id` - Actualizar
- `DELETE /api/planillas/:id` - Eliminar

### Empresas
- `GET /api/empresas` - Listar
- `POST /api/empresas` - Crear
- `PUT /api/empresas/:id` - Actualizar
- `PATCH /api/empresas/:id/toggle-status` - Cambiar estado
- `DELETE /api/empresas/:id` - Eliminar

### Productos
- `GET /api/productos` - Listar
- `POST /api/productos` - Crear
- `PUT /api/productos/:id` - Actualizar
- `PATCH /api/productos/:id/toggle-status` - Cambiar estado
- `DELETE /api/productos/:id` - Eliminar

### Usuarios
- `GET /api/usuarios` - Listar
- `POST /api/usuarios` - Crear
- `PUT /api/usuarios/:id` - Actualizar
- `PATCH /api/usuarios/:id/toggle-status` - Cambiar estado
- `DELETE /api/usuarios/:id` - Eliminar

## Rutas Frontend

- `/` - Dashboard
- `/login` - Inicio de sesión
- `/planillas` - Listado de planillas
- `/planillas/nueva` - Crear planilla
- `/planillas/:id/editar` - Editar planilla
- `/config/empresas` - Gestión de empresas
- `/config/productos` - Gestión de productos
- `/config/usuarios` - Gestión de usuarios

## Permisos por Rol

| Recurso | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| Planillas | CRUD | CRU | R |
| Empresas | CRUD | - | - |
| Productos | CRUD | CRUD | R |
| Usuarios | CRUD | - | - |

## Tecnologías

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- Zod (validación)

### Frontend
- React 18
- Vite
- TypeScript
- React Router v6
- Axios
- CSS puro (personalizable)

## Estados de las Planillas

Las planillas tienen los siguientes estados (`PlanillaEstado`):

| Estado | Descripción | Color UI |
|--------|-------------|----------|
| **A** | **Abierta** - Planilla recién creada, en proceso de captura | Azul |
| **B** | **Con alertas** - Planilla con errores o inconsistencias detectadas | Rojo |
| **C** | **Cerrada/Completada** - Planilla finalizada y confirmada | Verde |
| **D** | **Revisada** - Planilla revisada y aprobada por un supervisor | Naranja |

### Flujo de Estados

```
A (Abierta) → B (Con alertas) → C (C
```

- **Abierta (A)**: El usuario está capturando datos de ventas, productos y otros movimientos.
- **Con alertas (B)**: Planilla que tiene errores o inconsistencias detectadas
- **Cerrada (C)**: La planilla está completa y lista para revisión.
- **Revisada (D)**: Un administrador ha revisado y aprobado la planilla.

### Campos Relacionados

- `PlanillaAprobFecha`: Fecha en que se marcó como revisada
- `PlanillaAprobUser`: ID del usuario que revisó la planilla
- `PlanillaFechaVencimiento`: Fecha límite para completar (36 horas por defecto)
- `PlanillaEnvioNotificacion`: Indica si se envió notificación de vencimiento

## Tareas Programadas

### Creación Masiva de Planillas

- `POST /api/tareas/crear-planillas-masivas` - Crea planillas para empresas activas
- `GET /api/tareas/estado` - Ver estadísticas de planillas

**Criterios:**
- Empresas con `EmpresaEstado = 'A'` y `EmpresaPlanilla = true`
- Fecha dentro del rango `EmpresaInicioPlantilla` a `EmpresaFinPlantilla`

**Al crear:**
- `PlanillaFecha`: Fecha/hora actual
- `PlanillaEstado`: 'A'
- `PlanillaEnvioNotificacion`: false
- `PlanillaFechaNotificacion`: NULL
- `PlanillaFechaVencimiento`: +36 horas
- Clona productos de `EmpresaPlanilla`

### Notificación de Planillas Vencidas

Se ejecuta **diariamente a las 2:00 PM (Colombia)**.

**Criterios:**
- `PlanillaFechaVencimiento < now()` (ya venció)
- `PlanillaEnvioNotificacion = false` (no se ha notificado)
- `PlanillaEstado = 'A'` (abierta)

**Acciones:**
1. Envía correo a los usuarios de la empresa
2. Actualiza `PlanillaFechaNotificacion = now()`
3. Actualiza `PlanillaEnvioNotificacion = true`

**Endpoint manual:**
```bash
POST /api/tareas/notificar-vencidas
```

## Notas

- La contraseña se almacena hasheada con bcrypt
- Los tokens JWT expiran en 7 días (configurable)
- Los roles y permisos están preconfigurados en la base de datos
- El schema de Prisma refleja exactamente las tablas SQL proporcionadas


## Importación Masiva

### Importar Productos
- `POST /api/productos/importar` - Importa productos desde JSON array
- `GET /api/productos/importar/plantilla` - Descarga plantilla CSV

### Importar Productos por Empresa
- `POST /api/empresa-productos/importar` - Asocia productos a empresa
- `GET /api/empresa-productos/importar/plantilla` - Descarga plantilla CSV

### Rutas Frontend
- `/config/importar-productos` - Importar productos
- `/config/importar-empresa-productos` - Importar productos por empresa

## Credenciales por Defecto

> ⚠️ **IMPORTANTE:** Cambia estas credenciales en producción

| Campo | Valor |
|-------|-------|
| Email | admin@organics.com |
| Contraseña | admin123 |
| Rol | Administrador |

## Licencia

MIT License
