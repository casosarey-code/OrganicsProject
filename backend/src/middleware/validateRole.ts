import { Response, NextFunction } from 'express';
import { AuthRequest } from './authJwt';
import prisma from '../config/db';

export const validateRole = (...allowedRoles: string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const userRoles = await prisma.userRoles.findMany({
        where: { userId: req.user.userId },
        include: { role: true },
      });

      const userRoleNames = userRoles.map((ur) => ur.role.name);

      const hasRole = allowedRoles.some((role) =>
        userRoleNames.includes(role)
      );

      if (!hasRole) {
        res.status(403).json({
          error: 'ACCESO DENEGADO - validar con administrador (rol)',
          requiredRoles: allowedRoles,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar roles' });
    }
  };
};
