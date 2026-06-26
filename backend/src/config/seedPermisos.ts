import prisma from './db';

const permissions = [
  // Planillas
  { name: 'planillas_read', resource: 'planillas', action: 'read' },
  { name: 'planillas_create', resource: 'planillas', action: 'create' },
  { name: 'planillas_update', resource: 'planillas', action: 'update' },
  { name: 'planillas_delete', resource: 'planillas', action: 'delete' },
  // Empresas
  { name: 'empresas_read', resource: 'empresas', action: 'read' },
  { name: 'empresas_create', resource: 'empresas', action: 'create' },
  { name: 'empresas_update', resource: 'empresas', action: 'update' },
  { name: 'empresas_delete', resource: 'empresas', action: 'delete' },
  // Productos
  { name: 'productos_read', resource: 'productos', action: 'read' },
  { name: 'productos_create', resource: 'productos', action: 'create' },
  { name: 'productos_update', resource: 'productos', action: 'update' },
  { name: 'productos_delete', resource: 'productos', action: 'delete' },
  // Usuarios
  { name: 'usuarios_read', resource: 'usuarios', action: 'read' },
  { name: 'usuarios_create', resource: 'usuarios', action: 'create' },
  { name: 'usuarios_update', resource: 'usuarios', action: 'update' },
  { name: 'usuarios_delete', resource: 'usuarios', action: 'delete' },
  // Configuracion
  { name: 'config_read', resource: 'config', action: 'read' },
  { name: 'config_update', resource: 'config', action: 'update' },
  // Roles y Permisos
  { name: 'roles_read', resource: 'roles', action: 'read' },
  { name: 'roles_create', resource: 'roles', action: 'create' },
  { name: 'roles_update', resource: 'roles', action: 'update' },
  { name: 'roles_delete', resource: 'roles', action: 'delete' },
  // Dashboard Admin
  { name: 'dashboard_admin_read', resource: 'dashboard_admin', action: 'read' },
  // Analitica
  { name: 'analitica_read', resource: 'analitica', action: 'read' },
  // Config General
  { name: 'config_general_update', resource: 'config_general', action: 'update' },
  // Config Email
  { name: 'config_email_update', resource: 'config_email', action: 'update' },
  // Plantillas Email
  { name: 'plantillas_email_read', resource: 'plantillas_email', action: 'read' },
  { name: 'plantillas_email_create', resource: 'plantillas_email', action: 'create' },
  { name: 'plantillas_email_update', resource: 'plantillas_email', action: 'update' },
  { name: 'plantillas_email_delete', resource: 'plantillas_email', action: 'delete' },
  // Historial Correos
  { name: 'historial_correos_read', resource: 'historial_correos', action: 'read' },
  { name: 'historial_correos_delete', resource: 'historial_correos', action: 'delete' },
];

export async function seedPermissions() {
  console.log('Verificando permisos...');
  
  for (const perm of permissions) {
    await prisma.permissions.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  
  console.log('Permisos verificados/creados correctamente');
}
