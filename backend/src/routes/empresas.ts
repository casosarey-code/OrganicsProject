import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';
import { z } from 'zod';

const router = Router();

const createEmpresaSchema = z.object({
  EmpresaTipo: z.string().min(1).max(100),
  EmpresaNombre: z.string().min(1).max(100),
  EmpresaDescripcion: z.string().max(1000).optional(),
  EmpresaDocumento: z.string().max(1000).optional(),
  EmpresaNumeroDocumento: z.string().max(1000).optional(),
  EmpresaInicioPlantilla: z.string().datetime().optional(),
  EmpresaFinPlantilla: z.string().datetime().optional(),
  EmpresaEnvioCorreo: z.boolean().optional(),
  EmpresaCorreoNotificacion: z.string().max(100).optional().or(z.literal('')),
  EmpresaPlanilla: z.boolean().optional(),
  EmpresaLogo: z.string().max(500).optional(),
});

const updateEmpresaSchema = createEmpresaSchema.partial();

router.use(authJwt);

router.get('/', validatePermission('empresas_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = req.query;

    const where: any = {};
    if (estado) where.EmpresaEstado = estado;

    const empresas = await prisma.empresas.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { planillas: true } },
      },
      orderBy: { EmpresaNombre: 'asc' },
    });

    res.json(empresas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.userId;

    // Verificar si el usuario está solicitando su propia empresa
    if (requestingUserId) {
      const requestingUser = await prisma.users.findUnique({
        where: { id: requestingUserId },
        select: { UserEmpresaID: true },
      });

      // Si no tiene el permiso empresas_read Y no es su propia empresa, denegar
      const isOwnEmpresa = requestingUser?.UserEmpresaID === parseInt(id);
      
      // Verificar permisos del usuario (si están disponibles)
      const userPermissions = (req as any).permissions || [];
      const hasPermission = userPermissions.includes('empresas_read');

      if (!hasPermission && !isOwnEmpresa) {
        res.status(403).json({ error: 'No tienes permiso para ver esta empresa' });
        return;
      }
    }

    const empresa = await prisma.empresas.findUnique({
      where: { EmpresaID: parseInt(id) },
      include: {
        creator: { select: { id: true, fullName: true } },
        _count: { select: { planillas: true } },
      },
    });

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    res.json(empresa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
});

router.post('/', validatePermission('empresas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createEmpresaSchema.parse(req.body);

    const empresa = await prisma.empresas.create({
      data: {
        EmpresaTipo: data.EmpresaTipo,
        EmpresaNombre: data.EmpresaNombre,
        EmpresaDescripcion: data.EmpresaDescripcion,
        EmpresaDocumento: data.EmpresaDocumento,
        EmpresaNumeroDocumento: data.EmpresaNumeroDocumento,
        EmpresaInicioPlantilla: data.EmpresaInicioPlantilla ? new Date(data.EmpresaInicioPlantilla) : null,
        EmpresaFinPlantilla: data.EmpresaFinPlantilla ? new Date(data.EmpresaFinPlantilla) : null,
        EmpresaEnvioCorreo: data.EmpresaEnvioCorreo,
        EmpresaCorreoNotificacion: data.EmpresaCorreoNotificacion,
        EmpresaPlanilla: data.EmpresaPlanilla || false,
        EmpresaLogo: data.EmpresaLogo,
        EmpresaCreaUsuario: req.user!.userId,
        EmpresaCreaFecha: new Date(),
      },
    });

    res.status(201).json(empresa);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

router.put('/:id', validatePermission('empresas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateEmpresaSchema.parse(req.body);

    const empresa = await prisma.empresas.update({
      where: { EmpresaID: parseInt(id) },
      data: {
        ...data,
        EmpresaInicioPlantilla: data.EmpresaInicioPlantilla ? new Date(data.EmpresaInicioPlantilla) : undefined,
        EmpresaFinPlantilla: data.EmpresaFinPlantilla ? new Date(data.EmpresaFinPlantilla) : undefined,
      },
    });

    res.json(empresa);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

router.patch('/:id/toggle-status', validatePermission('empresas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const empresa = await prisma.empresas.findUnique({
      where: { EmpresaID: parseInt(id) },
      select: { EmpresaEstado: true },
    });

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const newStatus = empresa.EmpresaEstado === 'A' ? 'I' : 'A';

    await prisma.empresas.update({
      where: { EmpresaID: parseInt(id) },
      data: { EmpresaEstado: newStatus },
    });

    res.json({ message: `Empresa ${newStatus === 'A' ? 'activada' : 'desactivada'} correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado de empresa' });
  }
});

router.delete('/:id', validatePermission('empresas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.empresas.delete({
      where: { EmpresaID: parseInt(id) },
    });

    res.json({ message: 'Empresa eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
});

export default router;
