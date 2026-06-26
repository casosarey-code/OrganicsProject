import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import prisma from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authJwt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Usuario no válido o inactivo' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
