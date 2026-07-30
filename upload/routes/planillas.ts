import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt, AuthRequest } from '../middleware/authJwt';
import { validateRole } from '../middleware/validateRole';
import { validatePermission } from '../middleware/validatePermission';
import { z } from 'zod';

const router = Router();

const createPlanillaSchema = z.object({
  PlanillaFecha: z.string().optional(),
  PlanillaFechaVencimiento: z.string().optional().nullable(),
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
  PlanillaFechaVencimiento: z.string().optional().nullable(),
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

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { fecha, puntoVenta, estado } = req.query;
    const userId = req.user!.userId;

    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });

    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const where: any = {};
    if (fecha) where.PlanillaFecha = { contains: fecha };
    if (puntoVenta) where.PlanillaPuntoVenta = parseInt(puntoVenta as string);
    if (estado) where.PlanillaEstado = estado;

    if (!isAdmin && usuario?.UserEmpresaID) {
      where.PlanillaPuntoVenta = usuario.UserEmpresaID;
    }

    const planillas = await prisma.planilla.findMany({
      where,
      select: {
        PlanillaID: true,
        PlanillaFecha: true,
        PlanillaPuntoVenta: true,
        PlanillaEstado: true,
        PlanillaVentaBruta: true,
        PlanillaVentaNeta: true,
        PlanillaCreaFecha: true,
        puntoVenta: {
          select: {
            EmpresaID: true,
            EmpresaNombre: true,
            EmpresaTipo: true,
          }
        },
        creador: {
          select: { id: true, fullName: true, email: true }
        },
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

    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });

    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const planilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
      include: {
        puntoVenta: true,
        creador: { select: { id: true, fullName: true, email: true } },
        aprobUser: { select: { id: true, fullName: true } },
        detalles: {
          include: { producto: true },
          orderBy: { PDID: 'asc' },
        },
        otros: true,
      },
    });

    if (planilla) {
      const empresaId = planilla.PlanillaPuntoVenta;
      const empresaProductos = await prisma.empresaPlanilla.findMany({
        where: { EmpresaID: empresaId, EPActivo: true },
      });

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

    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

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

    const empresaProductos = await prisma.empresaPlanilla.findMany({
      where: {
        EmpresaID: data.PlanillaPuntoVenta,
        EPActivo: true,
      },
    });

    // INCLUIR todos los productos activos (sin filtrar por ProductoSoloContabilidad)
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
        PlanillaFechaVencimiento: data.PlanillaFechaVencimiento ? new Date(data.PlanillaFechaVencimiento) : null,
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaCreaUsuario: req.user!.userId,
        PlanillaVentaBruta: data.PlanillaVentaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo,
        PlanillaVentaBancos: data.PlanillaVentaBancos,
        PlanillaVentaNeta: data.PlanillaVentaNeta,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
        detalles: detallesData.length > 0 ? {
          create: detallesData.map((d: any) => ({
            PDProducto: d.PDProducto,
            PDCantInicial: d.PDCantInicial || 0,
            PDCantCompra: d.PDCantCompra || 0,
            PDCantAjuste: d.PDCantAjuste || 0,
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || 0,
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
    const data = req.body;
    const userId = req.user!.userId;

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

    if (!isAdmin && usuario?.UserEmpresaID) {
      if (existingPlanilla.PlanillaPuntoVenta !== usuario.UserEmpresaID) {
        res.status(403).json({ error: 'No tienes acceso a esta planilla' });
        return;
      }
    }

    const productosSoloContabilidad = await prisma.productos.findMany({
      where: {},
      select: { ProductoID: true, ProductoSoloContabilidad: true },
    });
    const soloContabilidadIds = new Set(
      productosSoloContabilidad
        .filter(p => p.ProductoSoloContabilidad === true)
        .map(p => p.ProductoID)
    );
    
    let ventaBruta = 0;
    
    if (data.detalles) {
      for (const detalle of data.detalles) {
        if (!soloContabilidadIds.has(detalle.PDProducto)) {
          const valor = Number(detalle.PDCantValor) || 0;
          ventaBruta += valor;
        }
      }
    }
    
    const planilla = await prisma.planilla.update({
      where: { PlanillaID: parseInt(id) },
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : undefined,
        PlanillaFechaVencimiento: data.PlanillaFechaVencimiento ? new Date(data.PlanillaFechaVencimiento) : null,
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaVentaBruta: ventaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo ?? ventaBruta,
        PlanillaVentaBancos: data.PlanillaVentaBancos ?? 0,
        PlanillaVentaNeta: ventaBruta,
        PlanillaEstado: data.PlanillaEstado,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
      },
    });

    if (data.detalles) {
      for (const d of data.detalles) {
        const detalleExistente = await prisma.planillaDetalle.findFirst({
          where: {
            PlanillaID: parseInt(id),
            PDProducto: d.PDProducto,
          },
        });
        
        if (detalleExistente) {
          await prisma.planillaDetalle.update({
            where: { PDID: detalleExistente.PDID },
            data: {
              PDCantInicial: d.PDCantInicial || 0,
              PDCantCompra: d.PDCantCompra || 0,
              PDCantAjuste: d.PDCantAjuste || 0,
              PDCantSubtotal: d.PDCantSubtotal,
              PDCantVenta: d.PDCantVenta || 0,
              PDCantValor: d.PDCantValor || 0,
              PDCantFinal: d.PDCantFinal,
            },
          });
        } else {
          await prisma.planillaDetalle.create({
            data: {
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
            },
          });
        }
      }
    }

    if (data.otros) {
      await prisma.planillaOtros.deleteMany({ where: { PlanillaID: parseInt(id) } });
      
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

    const composiciones = await prisma.productoComposicion.findMany({
      include: { producto: true, componente: true },
    });

    if (data.detalles && data.detalles.length > 0) {
      const composicionMap = new Map<number, { componenteId: number; cantidad: number }[]>();
      for (const comp of composiciones) {
        if (!composicionMap.has(comp.PCProducto)) {
          composicionMap.set(comp.PCProducto, []);
        }
        composicionMap.get(comp.PCProducto)!.push({
          componenteId: comp.PCComponente,
          cantidad: Number(comp.PCCantidad),
        });
      }

      const componentesSum: Map<number, number> = new Map();
      for (const detalle of data.detalles) {
        const venta = Number(detalle.PDCantVenta) || 0;
        const comps = composicionMap.get(detalle.PDProducto) || [];
        for (const comp of comps) {
          const suma = venta * comp.cantidad;
          componentesSum.set(
            comp.componenteId,
            (componentesSum.get(comp.componenteId) || 0) + suma
          );
        }
      }

      if (componentesSum.size > 0) {
        for (const detalle of data.detalles) {
          if (componentesSum.has(detalle.PDProducto)) {
            const sumaEquivalente = componentesSum.get(detalle.PDProducto) || 0;
            const ventaOriginal = Number(detalle.PDCantVenta) || 0;
            const nuevaVenta = ventaOriginal + sumaEquivalente;
            
            let sumaValores = 0;
            
            for (const otroDetalle of data.detalles) {
              const comps = composicionMap.get(otroDetalle.PDProducto) || [];
              const esComponente = comps.some(c => c.componenteId === detalle.PDProducto);
              if (esComponente) {
                const valorOtro = Number(otroDetalle.PDCantValor) || 0;
                sumaValores += valorOtro;
              }
            }
            
            const valorOriginal = Number(detalle.PDCantValor) || 0;
            const nuevoValor = valorOriginal + sumaValores;
            
            await prisma.planillaDetalle.updateMany({
              where: {
                PlanillaID: parseInt(id),
                PDProducto: detalle.PDProducto,
              },
              data: {
                PDCantVenta: nuevaVenta,
                PDCantValor: nuevoValor,
              },
            });
          }
        }
      }
    }

    const planillaActualizada = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
      include: {
        detalles: { 
          include: { producto: true },
          orderBy: { PDID: 'asc' },
        },
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
        PlanillaEstado: 'D',
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
