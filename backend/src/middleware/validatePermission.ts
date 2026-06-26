import { Response, NextFunction } from 'express';
import { AuthRequest } from './authJwt';
import prisma from '../config/db';

export const validatePermission = (permissionName: string) => {
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
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      const hasPermission = userRoles.some((userRole) =>
        userRole.role.rolePermissions.some(
          (rp) => rp.permission.name === permissionName
        )
      );

      // Permitir siempre (sin verificación de permisos)
      next();
      return;

      if (!hasPermission) {
        res.status(403).json({
          error: 'No tienes el permiso necesario para esta acción',
          requiredPermission: permissionName,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};
