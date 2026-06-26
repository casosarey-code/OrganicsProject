import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateToken } from '../config/jwt';
import { z } from 'zod';
import { loginRateLimiter, registerRateLimiter } from '../middleware/security';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', registerRateLimiter, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [{ email: data.email }, ...(data.username ? [{ username: data.username }] : [])],
      },
    });

    if (existingUser) {
      res.status(400).json({ error: 'El usuario ya existe' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.users.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        fullName: data.fullName,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
      },
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

router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Usuario inactivo' });
      return;
    }

    await prisma.users.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    const userRoles = await prisma.userRoles.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles: userRoles.map((ur) => ur.role.name),
        UserEmpresaID: (user as any).UserEmpresaID,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { verifyToken } = await import('../config/jwt');
    const decoded = verifyToken(token);

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const userRoles = await prisma.userRoles.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    res.json({
      ...user,
      roles: userRoles.map((ur) => ur.role.name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

export default router;
