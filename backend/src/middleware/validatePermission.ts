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

      // Optimizado: una sola consulta con roles y permisos
      const userRoles = await prisma.userRoles.findMany({
        where: { userId: req.user.userId },
        include: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: { name: true }
                  }
                }
              }
            }
          },
        },
      });

      // Si el usuario es admin, tiene todos los permisos
      const isAdmin = userRoles.some((ur) => ur.role.name === 'admin');
      
      if (isAdmin) {
        (req as any).permissions = [];
        (req as any).isAdmin = true;
        next();
        return;
      }

      // Verificar permiso
      const hasPermission = userRoles.some((userRole) =>
        userRole.role.rolePermissions.some(
          (rp) => rp.permission.name === permissionName
        )
      );

      // Adjuntar los permisos al request
      const allPermissions = userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name)
      );
      (req as any).permissions = allPermissions;

      if (!hasPermission) {
        res.status(403).json({
          error: 'No tienes el permiso necesario para esta acción',
          requiredPermission: permissionName,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error validatePermission:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};
