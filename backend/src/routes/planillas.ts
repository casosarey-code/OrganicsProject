import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt, AuthRequest } from '../middleware/authJwt';
import { validateRole } from '../middleware/validateRole';
import { validatePermission } from '../middleware/validatePermission';
import { z } from 'zod';
import { obtenerNFinalAnterior } from '../services/planillaService';

const router = Router();

const createPlanillaSchema = z.object({
  PlanillaFecha: z.string().optional(),
  PlanillaFechaVencimiento: z.string().optional().nullable(),
  PlanillaPuntoVenta: z.number().positive(),
  PlanillaVentaBruta: z.number().optional().nullable(),
  PlanillaVentaEfectivo: z.number().optional().nullable(),
  PlanillaVentaBancos: z.number().optional().nullable(),
  PlanillaVentaNeta: z.number().optional().nullable(),
  PlanillaVentaBOLD: z.number().optional().nullable(),
  PlanillaVentaNEQUI: z.number().optional().nullable(),
  PlanillaVentaDAVIPLATA: z.number().optional().nullable(),
  PlanillaVentaQR: z.number().optional().nullable(),
  detalles: z.array(z.object({
    PDProducto: z.number().positive(),
    PDCantInicial: z.number().min(0).default(0),
    PDCantCompra: z.number().min(0).default(0),
    PDCantAjuste: z.number().min(0).default(0),
    PDCantVenta: z.number().min(0).default(0),
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
  PlanillaPuntoVenta: z.number().positive().optional(),
  PlanillaVentaBruta: z.number().optional().nullable(),
  PlanillaVentaEfectivo: z.number().optional().nullable(),
  PlanillaVentaBancos: z.number().optional().nullable(),
  PlanillaVentaNeta: z.number().optional().nullable(),
  PlanillaVentaBOLD: z.number().optional().nullable(),
  PlanillaVentaNEQUI: z.number().optional().nullable(),
  PlanillaVentaDAVIPLATA: z.number().optional().nullable(),
  PlanillaVentaQR: z.number().optional().nullable(),
  detalles: z.array(z.object({
    PDProducto: z.number(),
    PDCantInicial: z.number().optional(),
    PDCantCompra: z.number().optional(),
    PDCantAjuste: z.number().optional(),
    PDCantVenta: z.number().optional(),
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

router.get('/', validatePermission('planillas_pv_ver'), async (req: AuthRequest, res: Response) => {
  try {
    const { fecha, puntoVenta, estado } = req.query;
    const userId = req.user!.userId;

    // Obtener datos del usuario incluyendo roles
    const usuario = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });

    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');

    const where: any = {};
    if (fecha) where.PlanillaFecha = { contains: fecha };
    if (puntoVenta) where.PlanillaPuntoVenta = parseInt(puntoVenta as string);
    if (estado) where.PlanillaEstado = estado;

    // Todas las planillas sin filtro de empresa

    // Consulta optimizada sin incluir relaciones pesadas
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

router.get('/:id', validatePermission('planillas_update'), async (req: AuthRequest, res: Response) => {
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
          orderBy: { PDOrden: 'asc' },
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
    // INCLUIR productos con su información (para verificar SoloContabilidad)
    const empresaProductos = await prisma.empresaPlanilla.findMany({
      where: {
        EmpresaID: data.PlanillaPuntoVenta,
        EPActivo: true,
      },
      select: {
        EPProducto: true,
        EPOrden: true,
        producto: {
          select: {
            ProductoID: true,
            ProductoSoloContabilidad: true,
          },
        },
      },
      orderBy: { EPOrden: 'asc' },
    });

    // Obtener N. Final de la planilla anterior (estado C o D)
    console.log(`[POST planilla] EmpresaID: ${data.PlanillaPuntoVenta}, Buscando N. Final...`);
    const nFinalAnterior = await obtenerNFinalAnterior(data.PlanillaPuntoVenta);
    console.log(`[POST planilla] N. Final encontrado: ${nFinalAnterior.size} productos`);

    // Si el usuario no envía detalles, clonar desde EmpresaPlanilla con N. Final anterior
    const detallesData = data.detalles && data.detalles.length > 0 
      ? data.detalles
      : empresaProductos.length > 0 
        ? empresaProductos.map((ep) => {
          // Si el producto es SoloContabilidad, usar N.Inicial = 0
          // De lo contrario, usar el N.Final de la planilla anterior
          const esSoloContabilidad = ep.producto?.ProductoSoloContabilidad === true;
          const nInicial = esSoloContabilidad ? 0 : (nFinalAnterior.get(ep.EPProducto) || 0);
          return {
            PDProducto: ep.EPProducto,
            PDCantInicial: nInicial,
            PDCantCompra: 0,
            PDCantAjuste: 0,
            PDCantSubtotal: nInicial, // Subtotal = Inicial
            PDCantVenta: 0,
            PDCantValor: 0,
            PDCantFinal: nInicial, // Final = Inicial
            PDOrden: ep.EPOrden,
          };
        })
        : [];

    // Crear fecha con hora local del servidor (sin timezone)
    const crearFechaLocal = (fechaStr?: string) => {
      if (!fechaStr) {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      }
      const [year, month, day] = fechaStr.split('T')[0].split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    };

    const planilla = await prisma.planilla.create({
      data: {
        PlanillaFecha: crearFechaLocal(data.PlanillaFecha),
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
            PDCantSubtotal: d.PDCantSubtotal ?? (d.PDCantInicial || 0),
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || 0,
            PDCantFinal: d.PDCantFinal ?? (d.PDCantInicial || 0),
            PDOrden: d.PDOrden,
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

    // Actualizar planilla con totales del frontend (NO recalcular)
    const planilla = await prisma.planilla.update({
      where: { PlanillaID: parseInt(id) },
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : undefined,
        PlanillaFechaVencimiento: data.PlanillaFechaVencimiento ? new Date(data.PlanillaFechaVencimiento) : null,
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaVentaBruta: data.PlanillaVentaBruta ?? 0,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo ?? 0,
        PlanillaVentaBancos: data.PlanillaVentaBancos ?? 0,
        PlanillaVentaNeta: data.PlanillaVentaNeta ?? 0,
        PlanillaEstado: data.PlanillaEstado,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
      },
    });

    // Actualizar detalles si existen - buscar por producto para evitar problemas de orden
    if (data.detalles) {
      for (const d of data.detalles) {
        // Buscar el detalle por PlanillaID y PDProducto
        const detalleExistente = await prisma.planillaDetalle.findFirst({
          where: {
            PlanillaID: parseInt(id),
            PDProducto: d.PDProducto,
          },
        });
        
        if (detalleExistente) {
          // Actualizar el detalle existente usando PDID
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
          // Crear nuevo detalle si no existe
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
        detalles: { 
          include: { producto: true },
          orderBy: { PDOrden: 'asc' },
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

// POST /api/planillas/:id/reordenar - Reordenar detalles de una planilla
router.post('/:id/reordenar', validatePermission('planillas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ordenes } = req.body as { ordenes: { pdId: number; nuevoOrden: number }[] };
    
    if (!ordenes || !Array.isArray(ordenes)) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    // Verificar que la planilla existe
    const planilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
    });

    if (!planilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    // Verificar acceso (admin o misma empresa)
    const usuario = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      select: { UserEmpresaID: true, userRoles: { include: { role: true } } },
    });
    const isAdmin = usuario?.userRoles.some((ur) => ur.role.name === 'admin');
    
    if (!isAdmin && usuario?.UserEmpresaID && planilla.PlanillaPuntoVenta !== usuario.UserEmpresaID) {
      res.status(403).json({ error: 'No tienes acceso a esta planilla' });
      return;
    }

    // Actualizar cada orden
    await prisma.$transaction(
      ordenes.map((item) =>
        prisma.planillaDetalle.update({
          where: { PDID: item.pdId },
          data: { PDOrden: item.nuevoOrden },
        })
      )
    );

    res.json({ message: 'Orden actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al reordenar detalles' });
  }
});

// POST /api/planillas/:id/aplicar-orden-empresa - Copiar EPOrden a PDOrden
router.post('/:id/aplicar-orden-empresa', validatePermission('planillas_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar que la planilla existe y obtener la empresa
    const planilla = await prisma.planilla.findUnique({
      where: { PlanillaID: parseInt(id) },
      include: {
        detalles: {
          select: { PDID: true, PDProducto: true },
        },
      },
    });

    if (!planilla) {
      res.status(404).json({ error: 'Planilla no encontrada' });
      return;
    }

    // Obtener los productos de la empresa con su orden
    const empresaProductos = await prisma.empresaPlanilla.findMany({
      where: { EmpresaID: planilla.PlanillaPuntoVenta },
      select: { EPProducto: true, EPOrden: true },
    });

    // Crear un mapa de producto -> orden
    const ordenMap = new Map(
      empresaProductos.map((ep) => [ep.EPProducto, ep.EPOrden])
    );

    // Actualizar cada detalle con el orden de la empresa
    const updates = planilla.detalles.map((detalle) => {
      const nuevoOrden = ordenMap.get(detalle.PDProducto);
      if (nuevoOrden !== undefined) {
        return prisma.planillaDetalle.update({
          where: { PDID: detalle.PDID },
          data: { PDOrden: nuevoOrden },
        });
      }
      return null;
    }).filter(Boolean);

    await prisma.$transaction(updates);

    res.json({ message: 'Orden aplicado correctamente desde empresa' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al aplicar orden de empresa' });
  }
});

export default router;
