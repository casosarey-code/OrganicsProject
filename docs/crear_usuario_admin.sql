-- ===========================================
-- SCRIPT PARA CREAR USUARIO ADMIN
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- 1. Crear rol "admin" si no existe
INSERT INTO roles (name, description)
VALUES ('admin', 'Administrador del sistema')
ON CONFLICT (name) DO NOTHING;

-- 2. Crear el usuario admin
-- La contraseña "Admin123456" está hasheada con bcrypt (10 rondas)
-- Puedes cambiarla después desde la aplicación
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
VALUES (
  gen_random_uuid(),                                    -- id (UUID)
  'admin@organics.com',                                -- email
  'admin',                                             -- username
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- password: "password"
  'Administrador',                                     -- full_name
  true,                                                -- is_active
  true,                                                -- is_verified
  NOW(),                                               -- created_at
  NOW()                                                -- updated_at
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- 3. Asignar rol admin al usuario
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT 
  u.id,
  r.id,
  NOW()
FROM users u, roles r
WHERE u.email = 'admin@organics.com'
  AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Verificar que se creó correctamente
SELECT 
  u.email,
  u.username,
  u.full_name,
  u.is_active,
  r.name as rol
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@organics.com';

-- ===========================================
-- NOTA: Para cambiar la contraseña desde SQL
-- usa este comando:
--
-- UPDATE users 
-- SET password_hash = '$2a$10$...hash_bcrypt...'
-- WHERE email = 'admin@organics.com';
--
-- O puedes usar un generador online de bcrypt:
-- https://bcrypt-generator.com/
-- ===========================================
