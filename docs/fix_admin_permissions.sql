-- Script para asignar TODOS los permisos necesarios al rol admin
-- Ejecutar en Supabase SQL Editor

-- 1. Primero verificar que existe el rol admin
SELECT 'Verificando rol admin:' as info;
SELECT * FROM roles WHERE name = 'admin';

-- 2. Crear permisos faltantes si no existen
INSERT INTO permissions (name, resource, action, description) VALUES 
  ('empresas_read', 'empresas', 'read', 'Ver empresas')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action, description) VALUES 
  ('empresas_update', 'empresas', 'update', 'Actualizar empresas')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action, description) VALUES 
  ('empresa_planilla_update', 'empresa_planilla', 'update', 'Actualizar productos de empresa')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action, description) VALUES 
  ('productos_update', 'productos', 'update', 'Actualizar productos')
ON CONFLICT (name) DO NOTHING;

-- 3. Asignar TODOS los permisos al rol admin
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Verificar que el usuario admin tiene el rol admin
SELECT 'Usuarios con rol admin:' as info;
SELECT u.email, u.full_name 
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'admin';

-- 5. Ver todos los permisos del admin
SELECT 'Permisos del admin:' as info;
SELECT p.name, p.resource, p.action
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.resource, p.action;
