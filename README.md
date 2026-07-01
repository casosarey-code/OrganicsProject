# OrganicsProject - Sistema de Planillas

Sistema de gestión de planillas para puntos de venta desarrollado con React, Node.js, Express y PostgreSQL/Supabase.

## 🚀 Demo
- **Producción**: https://www.dcbsas.com

## 📋 Requisitos
- Node.js 18+
- npm o yarn
- Base de datos PostgreSQL (local o Supabase)

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/casosarey-code/OrganicsProject.git
cd OrganicsProject
```

### 2. Instalar dependencias
```bash
npm run install:all
```

### 3. Configurar variables de entorno
```bash
# Backend - crear archivo .env
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales
```

### 4. Configurar base de datos

#### Opción A: Supabase (Producción recomendada)
1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar el script de migración:
   - Ir a Supabase Dashboard → SQL Editor
   - Copiar contenido de `backend/supabase_migration.sql`
   - Ejecutar
3. Actualizar `DATABASE_URL` en `.env` con las credenciales de Supabase

#### Opción B: PostgreSQL local
```bash
cd backend
npx prisma db push
```

### 5. Generar Prisma Client
```bash
npm run prisma:generate
```

### 6. Iniciar en desarrollo
```bash
# Backend (puerto 5000)
npm run dev:backend

# Frontend (puerto 3000)
npm run dev:frontend
```

## 📦 Deploy en Hostinger

### Opción 1: Script automatizado
```bash
chmod +x deploy.sh
./deploy.sh
```

### Opción 2: Manual
```bash
# 1. Instalar todo
npm run install:all

# 2. Generar Prisma
npm run prisma:generate

# 3. Compilar
npm run build

# 4. Backend (en una terminal separada o con PM2)
cd backend && npm start
```

### Configuración en Hostinger

1. **Variables de entorno**: Crear `backend/.env` con:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
JWT_SECRET=[SECRET_SEGURO]
FRONTEND_URL=https://www.dcbsas.com
PORT=5000
NODE_ENV=production
```

2. **Frontend**: Copiar `frontend/dist/*` a la carpeta pública de Hostinger

3. **Backend**: Ejecutar con PM2 para producción:
```bash
npm install -g pm2
cd backend
pm2 start dist/server.js --name organics-api
```

## 📁 Estructura del proyecto

```
OrganicsProject/
├── backend/
│   ├── src/
│   │   ├── routes/        # Rutas de la API
│   │   ├── middleware/     # Middlewares (auth, permisos)
│   │   ├── services/      # Servicios (email)
│   │   └── config/        # Configuración
│   ├── prisma/
│   │   └── schema.prisma  # Schema de la base de datos
│   └── dist/              # Código compilado (producción)
├── frontend/
│   ├── src/
│   │   ├── pages/         # Páginas de React
│   │   ├── components/    # Componentes reutilizables
│   │   ├── contexts/      # Contextos (Auth)
│   │   └── api/           # Llamadas a la API
│   └── dist/              # Build de producción
├── deploy.sh              # Script de deploy
└── README.md
```

## 🔐 Roles y Permisos

El sistema cuenta con 3 roles predefinidos:
- **admin**: Acceso completo al sistema
- **manager**: Gestión de planillas y productos
- **user**: Acceso básico

## 📧 Configuración de Email

Para enviar correos, configurar SMTP en `configuracionsmtp`:
- Host, puerto, usuario, contraseña
- Activar en la configuración

## 🛡️ Seguridad

- Autenticación con JWT
- Roles y permisos por recurso
- Rate limiting habilitado
- Helmet para headers de seguridad

## 📝 Licencia
ISC


## 🚀 Para aplicar los cambios:

__1. Compila el backend:__

```bash
cd backend
npm install --include=dev
npm run build
```

__2. Sube al servidor:__

```bash
scp -r backend/dist backend/node_modules backend/prisma backend/package.json backend/package-lock.json root@2.25.71.62:/opt/frontend/
```

__3. En el servidor, reinicia el backend:__

```bash
pm2 restart backend
```

¿Necesitas ayuda con algún paso?
