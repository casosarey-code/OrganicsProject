import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
  fullName: z.string().optional(),
  roles: z.array(z.number().int().positive()).optional(),
  UserEmpresaID: z.number().int().positive().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().optional(),
  roles: z.array(z.number().int().positive()).optional(),
  UserEmpresaID: z.number().int().positive().optional(),
});

router.use(authJwt);

// Obtener usuario actual (logueado)
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { 
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      UserEmpresaID: user.UserEmpresaID,
      roles: user.userRoles.map((ur) => ({ 
        id: ur.role.id, 
        name: ur.role.name,
        rolePermissions: ur.role.rolePermissions
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

router.get('/', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { activo } = req.query;

    const where: any = {};
    if (activo !== undefined) where.isActive = activo === 'true';

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        UserEmpresaID: true,
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      isActive: u.isActive,
      isVerified: u.isVerified,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      UserEmpresaID: (u as any).UserEmpresaID,
      roles: u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

router.get('/:id', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        UserEmpresaID: true,
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      ...user,
      roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

router.post('/', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [{ email: data.email }, ...(data.username ? [{ username: data.username }] : [])],
      },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El usuario ya existe' });
      return;
    }

    if (data.roles && data.roles.length > 0) {
      const validRoles = await prisma.roles.findMany({
        where: { id: { in: data.roles } },
      });
      if (validRoles.length !== data.roles.length) {
        res.status(400).json({ error: 'Algunos roles no son válidos' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.users.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        UserEmpresaID: data.UserEmpresaID,
        userRoles: data.roles ? {
          create: data.roles.map((roleId) => ({
            roleId,
            assignedBy: req.user!.userId,
          })),
        } : undefined,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/:id', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existingUser = await prisma.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (data.email || data.username) {
      const existing = await prisma.users.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.email ? [{ email: data.email }] : []),
                ...(data.username ? [{ username: data.username }] : []),
              ],
            },
          ],
        },
      });
      if (existing) {
        res.status(400).json({ error: 'Email o username ya está en uso' });
        return;
      }
    }

    if (data.roles) {
      const validRoles = await prisma.roles.findMany({
        where: { id: { in: data.roles } },
      });
      if (validRoles.length !== data.roles.length) {
        res.status(400).json({ error: 'Algunos roles no son válidos' });
        return;
      }
    }

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.username) updateData.username = data.username;
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.UserEmpresaID) updateData.UserEmpresaID = data.UserEmpresaID;

    const user = await prisma.users.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (data.roles !== undefined) {
      await prisma.userRoles.deleteMany({ where: { userId: id } });
      if (data.roles.length > 0) {
        await prisma.userRoles.createMany({
          data: data.roles.map((roleId) => ({
            userId: id,
            roleId,
            assignedBy: req.user!.userId,
          })),
        });
      }
    }

    const updatedUser = await prisma.users.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    res.json({
      id: updatedUser!.id,
      email: updatedUser!.email,
      username: updatedUser!.username,
      fullName: updatedUser!.fullName,
      isActive: updatedUser!.isActive,
      roles: updatedUser!.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.patch('/:id/toggle-status', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await prisma.users.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({ message: `Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado de usuario' });
  }
});

router.delete('/:id', validatePermission('usuarios_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.users.delete({
      where: { id },
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
