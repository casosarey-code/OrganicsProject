-- Script para verificar y asignar todos los permisos al rol admin
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el rol admin existe
SELECT 'ROL ADMIN:' as info;
SELECT * FROM roles WHERE name = 'admin';

-- 2. Verificar permisos faltantes para importadores
SELECT 'PERMISOS NECESARIOS PARA IMPORTADORES:' as info;
SELECT * FROM permissions WHERE name IN ('empresa_planilla_update', 'productos_update');

-- 3. Asignar permisos faltantes al rol admin
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN ('empresa_planilla_update', 'productos_update', 'empresas_update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Verificar todos los permisos del rol admin
SELECT 'PERMISOS DEL ADMIN:' as info;
SELECT p.name, p.resource, p.action
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.resource, p.action;

-- 5. Verificar si el usuario admin tiene el rol
SELECT 'USUARIOS CON ROL ADMIN:' as info;
SELECT u.email, u.full_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'admin';
