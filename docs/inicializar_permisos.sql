-- ===========================================
-- SCRIPT PARA INICIALIZAR PERMISOS Y ROLES
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- 1. CREAR TODOS LOS PERMISOS NECESARIOS
INSERT INTO permissions (name, resource, action, description) VALUES
  ('planillas_read', 'planillas', 'read', 'Ver planillas'),
  ('planillas_create', 'planillas', 'create', 'Crear planillas'),
  ('planillas_update', 'planillas', 'update', 'Actualizar planillas'),
  ('planillas_delete', 'planillas', 'delete', 'Eliminar planillas'),
  ('empresas_read', 'empresas', 'read', 'Ver empresas'),
  ('empresas_create', 'empresas', 'create', 'Crear empresas'),
  ('empresas_update', 'empresas', 'update', 'Actualizar empresas'),
  ('empresas_delete', 'empresas', 'delete', 'Eliminar empresas'),
  ('productos_read', 'productos', 'read', 'Ver productos'),
  ('productos_create', 'productos', 'create', 'Crear productos'),
  ('productos_update', 'productos', 'update', 'Actualizar productos'),
  ('productos_delete', 'productos', 'delete', 'Eliminar productos'),
  ('usuarios_read', 'usuarios', 'read', 'Ver usuarios'),
  ('usuarios_create', 'usuarios', 'create', 'Crear usuarios'),
  ('usuarios_update', 'usuarios', 'update', 'Actualizar usuarios'),
  ('usuarios_delete', 'usuarios', 'delete', 'Eliminar usuarios'),
  ('config_read', 'config', 'read', 'Ver configuración'),
  ('config_update', 'config', 'update', 'Actualizar configuración'),
  ('roles_read', 'roles', 'read', 'Ver roles'),
  ('roles_create', 'roles', 'create', 'Crear roles'),
  ('roles_update', 'roles', 'update', 'Actualizar roles'),
  ('roles_delete', 'roles', 'delete', 'Eliminar roles'),
  ('dashboard_admin_read', 'dashboard_admin', 'read', 'Ver dashboard admin'),
  ('analitica_read', 'analitica', 'read', 'Ver analítica'),
  ('config_general_update', 'config_general', 'update', 'Actualizar configuración general'),
  ('config_email_update', 'config_email', 'update', 'Actualizar configuración de email'),
  ('plantillas_email_read', 'plantillas_email', 'read', 'Ver plantillas de email'),
  ('plantillas_email_create', 'plantillas_email', 'create', 'Crear plantillas de email'),
  ('plantillas_email_update', 'plantillas_email', 'update', 'Actualizar plantillas de email'),
  ('plantillas_email_delete', 'plantillas_email', 'delete', 'Eliminar plantillas de email'),
  ('historial_correos_read', 'historial_correos', 'read', 'Ver historial de correos'),
  ('historial_correos_delete', 'historial_correos', 'delete', 'Eliminar historial de correos')
ON CONFLICT (name) DO NOTHING;

-- 2. CREAR ROL ADMIN
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema')
ON CONFLICT (name) DO NOTHING;

-- 3. ASIGNAR TODOS LOS PERMISOS AL ROL ADMIN
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. CREAR USUARIO ADMIN SI NO EXISTE
INSERT INTO users (
  id,
  email,
  username,
  password_hash,
  full_name,
  is_active,
  is_verified,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'admin@organics.com',
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Administrador',
  true,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@organics.com');

-- 5. ASIGNAR ROL ADMIN AL USUARIO ADMIN
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, NOW()
FROM users u, roles r
WHERE u.email = 'admin@organics.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. VERIFICAR QUE TODO ESTÉ CORRECTO
SELECT 'USUARIOS CREADOS:' as info;
SELECT id, email, full_name, is_active FROM users;

SELECT 'ROLES CREADOS:' as info;
SELECT id, name FROM roles;

SELECT 'PERMISOS CREADOS:' as info;
SELECT COUNT(*) as total_permisos FROM permissions;

SELECT 'ROL-PERMISOS:' as info;
SELECT r.name as rol, COUNT(rp.permission_id) as num_permisos
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name;

SELECT 'USUARIO-ROLES:' as info;
SELECT u.email, array_agg(ro.name) as roles
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles ro ON ur.role_id = ro.id
GROUP BY u.email;

-- ===========================================
-- NOTA: Contraseña del admin es "password"
-- Puedes cambiarla desde la aplicación o regenerate el hash
-- ===========================================
