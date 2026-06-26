import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt, AuthRequest } from '../middleware/authJwt';
import { validateRole } from '../middleware/validateRole';
import { validatePermission } from '../middleware/validatePermission';
import { z } from 'zod';

const router = Router();

const createPlanillaSchema = z.object({
  PlanillaFecha: z.string().optional(),
  PlanillaPuntoVenta: z.number().int().positive(),
  PlanillaVentaBruta: z.number().int().optional().nullable(),
  PlanillaVentaEfectivo: z.number().int().optional().nullable(),
  PlanillaVentaBancos: z.number().int().optional().nullable(),
  PlanillaVentaNeta: z.number().int().optional().nullable(),
  PlanillaVentaBOLD: z.number().int().optional().nullable(),
  PlanillaVentaNEQUI: z.number().int().optional().nullable(),
  PlanillaVentaDAVIPLATA: z.number().int().optional().nullable(),
  PlanillaVentaQR: z.number().int().optional().nullable(),
  detalles: z.array(z.object({
    PDProducto: z.number().int().positive(),
    PDCantInicial: z.number().int().min(0).default(0),
    PDCantCompra: z.number().int().min(0).default(0),
    PDCantAjuste: z.number().int().min(0).default(0),
    PDCantVenta: z.number().int().min(0).default(0),
    PDCantValor: z.number().optional(),
  })).optional(),
  otros: z.array(z.object({
    PODescripcion: z.string(),
    POValor: z.number(),
    POCategoria: z.string(),
    POUrlEvidencia: z.string().optional().nullable(),
  })).optional(),
});

const updatePlanillaSchema = z.object({
  PlanillaFecha: z.string().optional(),
  PlanillaPuntoVenta: z.number().int().positive().optional(),
  PlanillaVentaBruta: z.number().int().optional().nullable(),
  PlanillaVentaEfectivo: z.number().int().optional().nullable(),
  PlanillaVentaBancos: z.number().int().optional().nullable(),
  PlanillaVentaNeta: z.number().int().optional().nullable(),
  PlanillaVentaBOLD: z.number().int().optional().nullable(),
  PlanillaVentaNEQUI: z.number().int().optional().nullable(),
  PlanillaVentaDAVIPLATA: z.number().int().optional().nullable(),
  PlanillaVentaQR: z.number().int().optional().nullable(),
  detalles: z.array(z.object({
    PDProducto: z.number().int(),
    PDCantInicial: z.number().int().optional(),
    PDCantCompra: z.number().int().optional(),
    PDCantAjuste: z.number().int().optional(),
    PDCantVenta: z.number().int().optional(),
    PDCantValor: z.number().optional(),
  })).optional(),
  otros: z.array(z.object({
    PODescripcion: z.string().optional(),
    POValor: z.number().optional(),
    POCategoria: z.string().optional(),
    POUrlEvidencia: z.string().optional().nullable(),
  })).optional(),
});

router.use(authJwt);

router.get('/', validatePermission('planillas_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { fecha, puntoVenta, estado } = req.query;
    const userId = req.user!.userId;

    // Obtener datos del usuario para saber su empresa
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });

    // Verificar si es admin
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const where: any = {};
    if (fecha) where.PlanillaFecha = { contains: fecha };
    if (puntoVenta) where.PlanillaPuntoVenta = parseInt(puntoVenta as string);
    if (estado) where.PlanillaEstado = estado;

    // Si no es admin, filtrar solo las planillas de su empresa
    if (!isAdmin && usuario?.UserEmpresaID) {
      where.PlanillaPuntoVenta = usuario.UserEmpresaID;
    }

    const planillas = await prisma.planilla.findMany({
      where,
      include: {
        puntoVenta: true,
        creador: { select: { id: true, fullName: true, email: true } },
        _count: { select: { detalles: true, otros: true } },
      },
      orderBy: { PlanillaFecha: 'desc' },
    });

    res.json(planillas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar planillas' });
  }
});

router.get('/:id', validatePermission('planillas_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Obtener datos del usuario
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });

    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    // Buscar planilla
    const planilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
      include: {
        puntoVenta: true,
        creador: { select: { id: true, fullName: true, email: true } },
        aprobUser: { select: { id: true, fullName: true } },
        detalles: {
          include: { producto: true },
        },
        otros: true,
      },
    });

    // Obtener valores de EmpresaPlanilla para cada detalle
    if (planilla) {
      const empresaId = planilla.PlanillaPuntoVenta;
      const empresaProductos = await prisma.empresaPlanilla.findMany({
        where: { EmpresaID: empresaId, EPActivo: true },
      });

      // Agregar el valor desde EmpresaPlanilla a cada detalle
      (planilla.detalles as any).forEach((detalle: any) => {
        const empProd = empresaProductos.find(ep => ep.EPProducto === detalle.PDProducto);
        if (empProd) {
          detalle.valorEmpresa = Number(empProd.EPValorProducto);
        }
      });
    }

    if (!planilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    // Si no es admin, verificar que la planilla sea de su empresa
    if (!isAdmin && usuario?.UserEmpresaID) {
      if (planilla.PlanillaPuntoVenta !== usuario.UserEmpresaID) {
        res.status(403).json({ error: 'No tienes acceso a esta planilla' });
        return;
      }
    }

    res.json(planilla);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener planilla' });
  }
});

router.post('/', validatePermission('planillas_create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createPlanillaSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verificar acceso
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    // Si no es admin, solo puede crear planillas para su empresa
    if (!isAdmin && usuario?.UserEmpresaID) {
      if (data.PlanillaPuntoVenta !== usuario.UserEmpresaID) {
        res.status(403).json({ error: 'Solo puedes crear planillas para tu empresa' });
        return;
      }
    }

    const empresa = await prisma.empresas.findUnique({
      where: { EmpresaID: data.PlanillaPuntoVenta },
    });

    if (!empresa) {
      res.status(400).json({ error: 'Punto de venta no encontrado' });
      return;
    }

    // Obtener productos de la empresa desde EmpresaPlanilla
    const empresaProductos = await prisma.empresaPlanilla.findMany({
      where: {
        EmpresaID: data.PlanillaPuntoVenta,
        EPActivo: true,
      },
      include: {
        producto: true,
      },
    });

    // Si el usuario no envía detalles, clonar desde EmpresaPlanilla
    const detallesData = data.detalles && data.detalles.length > 0 
      ? data.detalles
      : empresaProductos.length > 0 
        ? empresaProductos.map((ep) => ({
          PDProducto: ep.EPProducto,
          PDCantInicial: 0,
          PDCantCompra: 0,
          PDCantAjuste: 0,
          PDCantVenta: 0,
          PDCantValor: 0,
        }))
        : [];

    const planilla = await prisma.planilla.create({
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : new Date(),
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaCreaUsuario: req.user!.userId,
        PlanillaVentaBruta: data.PlanillaVentaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo,
        PlanillaVentaBancos: data.PlanillaVentaBancos,
        PlanillaVentaNeta: data.PlanillaVentaNeta,
        PlanillaEstado: data.PlanillaEstado,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
        detalles: detallesData.length > 0 ? {
          create: detallesData.map((d) => ({
            PDProducto: d.PDProducto,
            PDCantInicial: d.PDCantInicial || 0,
            PDCantCompra: d.PDCantCompra || 0,
            PDCantAjuste: d.PDCantAjuste || 0,
            PDCantSubtotal: d.PDCantSubtotal,
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || 0,
            PDCantFinal: d.PDCantFinal,
            PDUsuarioReg: req.user!.userId,
          })),
        } : undefined,
        otros: data.otros ? {
          create: data.otros.map((o) => ({
            PODescripcion: o.PODescripcion,
            POValor: o.POValor,
            POCategoria: o.POCategoria,
            POUrlEvidencia: o.POUrlEvidencia,
            POUsuarioReg: req.user!.userId,
          })),
        } : undefined,
      },
      include: {
        detalles: true,
        otros: true,
      },
    });

    res.status(201).json(planilla);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear planilla' });
  }
});

router.put('/:id', validatePermission('planillas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body; // Aceptar cualquier dato
    const userId = req.user!.userId;

    // Verificar acceso
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const existingPlanilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
    });

    if (!existingPlanilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    // Verificar acceso si no es admin
    if (!isAdmin && usuario?.UserEmpresaID) {
      if (existingPlanilla.PlanillaPuntoVenta !== usuario.UserEmpresaID) {
        res.status(403).json({ error: 'No tienes acceso a esta planilla' });
        return;
      }
    }

    // Actualizar planilla
    const planilla = await prisma.planilla.update({
      where: { PlanillaID: parseInt(id) },
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : undefined,
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaVentaBruta: data.PlanillaVentaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo,
        PlanillaVentaBancos: data.PlanillaVentaBancos,
        PlanillaVentaNeta: data.PlanillaVentaNeta,
        PlanillaEstado: data.PlanillaEstado,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
      },
    });

    // Actualizar detalles si existen
    if (data.detalles) {
      // Eliminar detalles existentes
      await prisma.planillaDetalle.deleteMany({ where: { PlanillaID: parseInt(id) } });
      
      // Crear nuevos detalles
      if (data.detalles.length > 0) {
        await prisma.planillaDetalle.createMany({
          data: data.detalles.map((d) => ({
            PlanillaID: parseInt(id),
            PDProducto: d.PDProducto,
            PDCantInicial: d.PDCantInicial || 0,
            PDCantCompra: d.PDCantCompra || 0,
            PDCantAjuste: d.PDCantAjuste || 0,
            PDCantSubtotal: d.PDCantSubtotal,
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || 0,
            PDCantFinal: d.PDCantFinal,
            PDUsuarioReg: req.user!.userId,
          })),
        });
      }
    }

    // Actualizar otros si existen
    if (data.otros) {
      // Eliminar otros existentes
      await prisma.planillaOtros.deleteMany({ where: { PlanillaID: parseInt(id) } });
      
      // Crear nuevos otros
      if (data.otros.length > 0) {
        await prisma.planillaOtros.createMany({
          data: data.otros.map((o) => ({
            PlanillaID: parseInt(id),
            PODescripcion: o.PODescripcion,
            POValor: o.POValor || 0,
            POCategoria: o.POCategoria,
            POUrlEvidencia: o.POUrlEvidencia,
            POUsuarioReg: req.user!.userId,
          })),
        });
      }
    }

    // Obtener la planilla actualizada
    const planillaActualizada = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
      include: {
        detalles: { include: { producto: true } },
        otros: true,
      },
    });

    res.json(planillaActualizada);
  } catch (error) {
    console.error('Error updating planilla:', error);
    res.status(500).json({ error: 'Error al actualizar planilla' });
  }
});

router.delete('/:id', validatePermission('planillas_delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Verificar acceso
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const existingPlanilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
    });

    if (!existingPlanilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    // Solo admin puede eliminar
    if (!isAdmin) {
      res.status(403).json({ error: 'Solo el administrador puede eliminar planillas' });
      return;
    }

    await prisma.planilla.delete({
      where: { PlanillaID: parseInt(id) },
    });

    res.json({ message: 'Planilla eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar planilla' });
  }
});

// Marcar planilla como revisada
router.patch('/:id/marcar-revisada', validatePermission('planillas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existingPlanilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
    });

    if (!existingPlanilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    const planilla = await prisma.planilla.update({
      where: { PlanillaID: parseInt(id) },
      data: {
        PlanillaEstado: 'D', // Revisado
        PlanillaAprobFecha: new Date(),
        PlanillaAprobUser: userId,
      },
    });

    res.json(planilla);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al marcar como revisada' });
  }
});

export default router;
