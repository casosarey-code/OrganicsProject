import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';

const router = Router();

router.use(authJwt);

router.get('/', validatePermission('config_update'), async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permissions.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(permissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar permisos' });
  }
});

// GET todos los permisos por rol
router.get('/role-permissions', validatePermission('config_update'), async (req: AuthRequest, res: Response) => {
  try {
    const rolePerms = await prisma.rolePermissions.findMany();
    
    // Agrupar por roleId
    const result: Record<number, number[]> = {};
    rolePerms.forEach(rp => {
      if (!result[rp.roleId]) result[rp.roleId] = [];
      result[rp.roleId].push(rp.permissionId);
    });
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener permisos por rol' });
  }
});

// POST asignar permiso a rol
router.post('/role-permissions', validatePermission('config_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, permissionId } = req.body;
    
    await prisma.rolePermissions.create({
      data: {
        roleId,
        permissionId,
        grantedBy: req.user!.userId,
      },
    });
    
    res.status(201).json({ message: 'Permiso asignado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al asignar permiso' });
  }
});

// DELETE quitar permiso de rol
router.delete('/role-permissions/:roleId/:permId', validatePermission('config_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, permId } = req.params;
    
    await prisma.rolePermissions.delete({
      where: {
        roleId_permissionId: {
          roleId: parseInt(roleId),
          permissionId: parseInt(permId),
        },
      },
    });
    
    res.json({ message: 'Permiso eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar permiso' });
  }
});

export default router;
