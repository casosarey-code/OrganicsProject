import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create roles
  const adminRole = await prisma.roles.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrador del sistema' },
  });

  const editorRole = await prisma.roles.upsert({
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor', description: 'Editor de contenido' },
  });

  const viewerRole = await prisma.roles.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer', description: 'Solo lectura' },
  });

  console.log('Roles created:', { adminRole, editorRole, viewerRole });

  // Create permissions
  const permissions = [
    { name: 'planillas_read', resource: 'planillas', action: 'read' },
    { name: 'planillas_create', resource: 'planillas', action: 'create' },
    { name: 'planillas_update', resource: 'planillas', action: 'update' },
    { name: 'planillas_delete', resource: 'planillas', action: 'delete' },
    { name: 'empresas_read', resource: 'empresas', action: 'read' },
    { name: 'empresas_create', resource: 'empresas', action: 'create' },
    { name: 'empresas_update', resource: 'empresas', action: 'update' },
    { name: 'empresas_delete', resource: 'empresas', action: 'delete' },
    { name: 'productos_read', resource: 'productos', action: 'read' },
    { name: 'productos_create', resource: 'productos', action: 'create' },
    { name: 'productos_update', resource: 'productos', action: 'update' },
    { name: 'productos_delete', resource: 'productos', action: 'delete' },
    { name: 'usuarios_read', resource: 'usuarios', action: 'read' },
    { name: 'usuarios_create', resource: 'usuarios', action: 'create' },
    { name: 'usuarios_update', resource: 'usuarios', action: 'update' },
    { name: 'usuarios_delete', resource: 'usuarios', action: 'delete' },
  ];

  for (const perm of permissions) {
    await prisma.permissions.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  console.log('Permissions created');

  // Assign all permissions to admin role
  const allPermissions = await prisma.permissions.findMany();
  
  for (const perm of allPermissions) {
    await prisma.rolePermissions.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('Admin role has all permissions');

  // Find admin user and assign admin role
  const adminUser = await prisma.users.findUnique({
    where: { email: 'admin@organics.com' },
  });

  if (adminUser) {
    await prisma.userRoles.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    console.log('Admin role assigned to user');
  } else {
    console.log('Admin user not found');
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
