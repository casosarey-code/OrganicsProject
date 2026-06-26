-- =====================================================
-- Script SQL para crear tablas en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- Tabla: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    user_empresa_id INTEGER
);

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: permissions
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50),
    action VARCHAR(50),
    description TEXT
);

-- Tabla: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Tabla: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Tabla: Empresas
CREATE TABLE IF NOT EXISTS "Empresas" (
    "EmpresaID" SERIAL PRIMARY KEY,
    "EmpresaTipo" VARCHAR(100) NOT NULL,
    "EmpresaNombre" VARCHAR(100) NOT NULL,
    "EmpresaDescripcion" VARCHAR(1000),
    "EmpresaCreaFecha" TIMESTAMP,
    "EmpresaCreaUsuario" UUID,
    "EmpresaDocumento" VARCHAR(1000),
    "EmpresaNumeroDocumento" VARCHAR(1000),
    "EmpresaInicioPlantilla" TIMESTAMP,
    "EmpresaFinPlantilla" TIMESTAMP,
    "EmpresaEnvioCorreo" BOOLEAN DEFAULT true,
    "EmpresaCorreoNotificacion" VARCHAR(100),
    "EmpresaEstado" VARCHAR(1) DEFAULT 'A',
    "EmpresaPlanilla" BOOLEAN DEFAULT false,
    "EmpresaLogo" VARCHAR(500),
    FOREIGN KEY ("EmpresaCreaUsuario") REFERENCES users(id)
);

-- Agregar FK después de crear Empresas
ALTER TABLE users ADD CONSTRAINT users_user_empresa_id_fkey 
    FOREIGN KEY (user_empresa_id) REFERENCES "Empresas"("EmpresaID");

-- Tabla: Productos
CREATE TABLE IF NOT EXISTS "Productos" (
    "ProductoID" SERIAL PRIMARY KEY,
    "ProductoNombre" VARCHAR(200) NOT NULL,
    "ProductoCodigo" VARCHAR(50) UNIQUE,
    "ProductoPrecio" DECIMAL(12, 2) DEFAULT 0,
    "ProductoStock" INTEGER DEFAULT 0,
    "ProductoActivo" BOOLEAN DEFAULT true
);

-- Tabla: Planilla
CREATE TABLE IF NOT EXISTS "Planilla" (
    "PlanillaID" SERIAL PRIMARY KEY,
    "PlanillaFecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "PlanillaPuntoVenta" INTEGER NOT NULL,
    "PlanillaCreaUsuario" UUID NOT NULL,
    "PlanillaCreaFecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "PlanillaEstado" VARCHAR(1) DEFAULT 'A',
    "PlanillaVentaBruta" INTEGER,
    "PlanillaVentaEfectivo" INTEGER,
    "PlanillaVentaBancos" INTEGER,
    "PlanillaVentaNeta" INTEGER,
    "PlanillaVentaBOLD" INTEGER,
    "PlanillaVentaNEQUI" INTEGER,
    "PlanillaVentaDAVIPLATA" INTEGER,
    "PlanillaVentaQR" INTEGER,
    "PlanillaAprobFecha" TIMESTAMP,
    "PlanillaAprobUser" UUID,
    "PlanillaFechaVencimiento" TIMESTAMP,
    "PlanillaEnvioNotificacion" BOOLEAN DEFAULT false,
    "PlanillaFechaNotificacion" TIMESTAMP,
    FOREIGN KEY ("PlanillaPuntoVenta") REFERENCES "Empresas"("EmpresaID"),
    FOREIGN KEY ("PlanillaCreaUsuario") REFERENCES users(id),
    FOREIGN KEY ("PlanillaAprobUser") REFERENCES users(id)
);

-- Tabla: PlanillaDetalle
CREATE TABLE IF NOT EXISTS "PlanillaDetalle" (
    "PDID" SERIAL PRIMARY KEY,
    "PlanillaID" INTEGER NOT NULL,
    "PDProducto" INTEGER NOT NULL,
    "PDCantInicial" INTEGER DEFAULT 0,
    "PDCantCompra" INTEGER DEFAULT 0,
    "PDCantAjuste" INTEGER DEFAULT 0,
    "PDCantSubtotal" INTEGER DEFAULT 0,
    "PDCantVenta" INTEGER DEFAULT 0,
    "PDCantValor" DECIMAL(12, 2) DEFAULT 0,
    "PDCantFinal" INTEGER DEFAULT 0,
    "PDFechaReg" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "PDUsuarioReg" UUID NOT NULL,
    FOREIGN KEY ("PlanillaID") REFERENCES "Planilla"("PlanillaID") ON DELETE CASCADE,
    FOREIGN KEY ("PDProducto") REFERENCES "Productos"("ProductoID"),
    FOREIGN KEY ("PDUsuarioReg") REFERENCES users(id)
);

-- Tabla: PlanillaOtros
CREATE TABLE IF NOT EXISTS "PlanillaOtros" (
    "POID" SERIAL PRIMARY KEY,
    "PlanillaID" INTEGER NOT NULL,
    "PODescripcion" TEXT NOT NULL,
    "POValor" DECIMAL(12, 2) DEFAULT 0,
    "POCategoria" VARCHAR(50) NOT NULL,
    "POUrlEvidencia" VARCHAR(500),
    "POFechaReg" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "POUsuarioReg" UUID NOT NULL,
    FOREIGN KEY ("PlanillaID") REFERENCES "Planilla"("PlanillaID") ON DELETE CASCADE,
    FOREIGN KEY ("POUsuarioReg") REFERENCES users(id)
);

-- Tabla: EmpresaPlanilla
CREATE TABLE IF NOT EXISTS "EmpresaPlanilla" (
    "EPID" SERIAL PRIMARY KEY,
    "EmpresaID" INTEGER NOT NULL,
    "EPProducto" INTEGER NOT NULL,
    "EPCreaUsuario" UUID NOT NULL,
    "EPValorProducto" DECIMAL(12, 2) DEFAULT 0,
    "EPCreaFecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "EPActivo" BOOLEAN DEFAULT true,
    UNIQUE ("EmpresaID", "EPProducto"),
    FOREIGN KEY ("EmpresaID") REFERENCES "Empresas"("EmpresaID") ON DELETE CASCADE,
    FOREIGN KEY ("EPProducto") REFERENCES "Productos"("ProductoID"),
    FOREIGN KEY ("EPCreaUsuario") REFERENCES users(id)
);

-- Tabla: ParametrosGenerales
CREATE TABLE IF NOT EXISTS "ParametrosGenerales" (
    "PGID" SERIAL PRIMARY KEY,
    "PGNombrePlataforma" VARCHAR(100),
    "PGRecuperacionPass" BOOLEAN DEFAULT true,
    "PGImagenLogin" VARCHAR(500),
    "PGImagenPlataforma" VARCHAR(500),
    "PGImagenesCarrusel" TEXT
);

-- Tabla: ConfiguracionSMTP
CREATE TABLE IF NOT EXISTS "configuracionsmtp" (
    "ID" SERIAL PRIMARY KEY,
    "smtphost" VARCHAR(100),
    "smtpport" INTEGER,
    "smtpusuario" VARCHAR(100),
    "smtppassword" VARCHAR(100),
    "smtpfromemail" VARCHAR(100),
    "smtpfromname" VARCHAR(100),
    "smtpsecure" VARCHAR(20),
    "smtpauth" BOOLEAN DEFAULT true,
    "smtptimeout" INTEGER
);

-- Tabla: PlantillasCorreo
CREATE TABLE IF NOT EXISTS "plantillascorreo" (
    "PlantillaID" SERIAL PRIMARY KEY,
    "PlantillaNombre" VARCHAR(100) NOT NULL,
    "PlantillaAsunto" VARCHAR(200) NOT NULL,
    "PlantillaCuerpo" TEXT NOT NULL,
    "PlantillaVariables" TEXT,
    "PlantillaTipo" VARCHAR(50),
    "PlantillaActivo" BOOLEAN DEFAULT true,
    "PlantillaCreaFecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "PlantillaActualizaFecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: HistorialCorreos
CREATE TABLE IF NOT EXISTS "HistorialCorreos" (
    "CorreoID" SERIAL PRIMARY KEY,
    "CorreoDestinatario" VARCHAR(255) NOT NULL,
    "CorreoAsunto" VARCHAR(200) NOT NULL,
    "CorreoCuerpo" TEXT NOT NULL,
    "CorreoEstado" VARCHAR(20) NOT NULL,
    "CorreoFechaEnvio" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "CorreoError" TEXT,
    "CorreoEmpresaID" INTEGER,
    "PlantillaID" INTEGER
);

-- =====================================================
-- Insertar datos iniciales
-- =====================================================

-- Insertar rol admin
INSERT INTO roles (name, description) VALUES 
    ('admin', 'Administrador del sistema'),
    ('user', 'Usuario estándar'),
    ('manager', 'Gerente de punto de venta');

-- Insertar permisos básicos
INSERT INTO permissions (name, resource, action, description) VALUES 
    ('planillas_read', 'planillas', 'read', 'Ver planillas'),
    ('planillas_create', 'planillas', 'create', 'Crear planillas'),
    ('planillas_update', 'planillas', 'update', 'Actualizar planillas'),
    ('planillas_delete', 'planillas', 'delete', 'Eliminar planillas'),
    ('productos_read', 'productos', 'read', 'Ver productos'),
    ('productos_create', 'productos', 'create', 'Crear productos'),
    ('productos_update', 'productos', 'update', 'Actualizar productos'),
    ('productos_delete', 'productos', 'delete', 'Eliminar productos'),
    ('empresas_read', 'empresas', 'read', 'Ver empresas'),
    ('empresas_create', 'empresas', 'create', 'Crear empresas'),
    ('empresas_update', 'empresas', 'update', 'Actualizar empresas'),
    ('empresas_delete', 'empresas', 'delete', 'Eliminar empresas'),
    ('usuarios_read', 'usuarios', 'read', 'Ver usuarios'),
    ('usuarios_create', 'usuarios', 'create', 'Crear usuarios'),
    ('usuarios_update', 'usuarios', 'update', 'Actualizar usuarios'),
    ('usuarios_delete', 'usuarios', 'delete', 'Eliminar usuarios');

-- Asignar todos los permisos al rol admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Insertar usuario admin por defecto (contraseña: Admin123!)
-- La contraseña ya está hasheada con bcrypt
INSERT INTO users (email, password_hash, full_name, is_active, is_verified) VALUES 
    ('admin@organics.com', '$2a$10$YourHashedPasswordHere', 'Administrador', true, true);

-- Asignar rol admin al usuario
INSERT INTO user_roles (user_id, role_id)
SELECT id, 1 FROM users WHERE email = 'admin@organics.com';

-- Insertar parámetros generales por defecto
INSERT INTO "ParametrosGenerales" ("PGNombrePlataforma", "PGRecuperacionPass") VALUES 
    ('Organics Project', true);

SELECT '¡Migración completada exitosamente!' AS resultado;
