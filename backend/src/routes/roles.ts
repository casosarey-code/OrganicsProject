import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';

const router = Router();

router.use(authJwt);

router.get('/', validatePermission('roles_read'), async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.roles.findMany({
      include: {
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar roles' });
  }
});

// POST - Crear rol
router.post('/', validatePermission('roles_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'El nombre es requerido' });
      return;
    }

    const existingRole = await prisma.roles.findUnique({ where: { name } });
    if (existingRole) {
      res.status(400).json({ error: 'El rol ya existe' });
      return;
    }

    const role = await prisma.roles.create({
      data: { name, description },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear rol' });
  }
});

// PUT - Actualizar rol
router.put('/:id', validatePermission('roles_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingRole = await prisma.roles.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    const role = await prisma.roles.update({
      where: { id: parseInt(id) },
      data: { name, description },
    });

    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// DELETE - Eliminar rol
router.delete('/:id', validatePermission('roles_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingRole = await prisma.roles.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    await prisma.roles.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
});

export default router;
