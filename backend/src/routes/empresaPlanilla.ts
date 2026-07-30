import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validateRole } from '../middleware/validateRole';
import { AuthRequest } from '../middleware/authJwt';
import { z } from 'zod';

const router = Router();

// Schema para validar datos
const createEmpresaPlanillaSchema = z.object({
  EmpresaID: z.number().int().positive(),
  EPProducto: z.number().int().positive(),
  EPValorProducto: z.number().min(0),
  EPOrden: z.number().int().min(0).optional(),
});

const updateEmpresaPlanillaSchema = z.object({
  EPValorProducto: z.number().min(0).optional(),
  EPActivo: z.boolean().optional(),
  EPOrden: z.number().int().min(0).optional(),
});

// Middleware de autenticación
router.use(authJwt);

// GET /api/empresa-planilla - Listar todos los productos por empresa
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { empresaId } = req.query;
    const where: any = {};
    
    if (empresaId) {
      where.EmpresaID = parseInt(empresaId as string);
    }

    const empresaPlanillas = await prisma.empresaPlanilla.findMany({
      where,
      include: {
        empresa: {
          select: {
            EmpresaID: true,
            EmpresaNombre: true,
          },
        },
        producto: {
          select: {
            ProductoID: true,
            ProductoNombre: true,
            ProductoCodigo: true,
          },
        },
      },
      orderBy: { EPCreaFecha: 'desc' },
    });

    res.json(empresaPlanillas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar productos de empresa' });
  }
});

// GET /api/empresa-planilla/empresa/:id - Obtener productos de una empresa específica
router.get('/empresa/:id', validateRole('Admin', 'editor', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const empresaPlanillas = await prisma.empresaPlanilla.findMany({
      where: {
        EmpresaID: parseInt(id),
        EPActivo: true,
      },
      include: {
        producto: {
          select: {
            ProductoID: true,
            ProductoNombre: true,
            ProductoCodigo: true,
          },
        },
      },
    });

    res.json(empresaPlanillas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos de la empresa' });
  }
});

// POST /api/empresa-planilla - Crear nuevo registro
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createEmpresaPlanillaSchema.parse(req.body);

    // Verificar que la empresa existe
    const empresa = await prisma.empresas.findUnique({
      where: { EmpresaID: data.EmpresaID },
    });

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    // Verificar que el producto existe
    const producto = await prisma.productos.findUnique({
      where: { ProductoID: data.EPProducto },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    // Verificar que no exista duplicado
    const existente = await prisma.empresaPlanilla.findUnique({
      where: {
        EmpresaID_EPProducto: {
          EmpresaID: data.EmpresaID,
          EPProducto: data.EPProducto,
        },
      },
    });

    if (existente) {
      res.status(400).json({ error: 'El producto ya está asignado a esta empresa' });
      return;
    }

    const empresaPlanilla = await prisma.empresaPlanilla.create({
      data: {
        EmpresaID: data.EmpresaID,
        EPProducto: data.EPProducto,
        EPValorProducto: data.EPValorProducto,
        EPOrden: data.EPOrden,
        EPCreaUsuario: req.user!.userId,
      },
      include: {
        producto: {
          select: {
            ProductoID: true,
            ProductoNombre: true,
          },
        },
      },
    });

    res.status(201).json(empresaPlanilla);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto de empresa' });
  }
});

// PUT /api/empresa-planilla/:id - Actualizar registro
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateEmpresaPlanillaSchema.parse(req.body);

    const existente = await prisma.empresaPlanilla.findUnique({
      where: { EPID: parseInt(id) },
    });

    if (!existente) {
      res.status(404).json({ error: 'Registro no encontrado' });
      return;
    }

    const empresaPlanilla = await prisma.empresaPlanilla.update({
      where: { EPID: parseInt(id) },
      data,
      include: {
        producto: {
          select: {
            ProductoID: true,
            ProductoNombre: true,
          },
        },
      },
    });

    res.json(empresaPlanilla);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto de empresa' });
  }
});

// POST /api/empresa-planilla/reordenar - Reordenar productos de una empresa
router.post('/reordenar', async (req: AuthRequest, res: Response) => {
  try {
    const { empresaId, ordenes } = req.body as { empresaId: number; ordenes: { epId: number; nuevoOrden: number }[] };
    
    if (!empresaId || !ordenes || !Array.isArray(ordenes)) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    // Actualizar cada orden
    await prisma.$transaction(
      ordenes.map((item) =>
        prisma.empresaPlanilla.update({
          where: { EPID: item.epId },
          data: { EPOrden: item.nuevoOrden },
        })
      )
    );

    // Obtener productos actualizados
    const productos = await prisma.empresaPlanilla.findMany({
      where: { EmpresaID: empresaId },
      include: { producto: { select: { ProductoID: true, ProductoNombre: true, ProductoCodigo: true } } },
      orderBy: { EPOrden: 'asc' },
    });

    res.json({ message: 'Orden actualizado', productos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al reordenar productos' });
  }
});

// DELETE /api/empresa-planilla/:id - Eliminar registro
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existente = await prisma.empresaPlanilla.findUnique({
      where: { EPID: parseInt(id) },
    });

    if (!existente) {
      res.status(404).json({ error: 'Registro no encontrado' });
      return;
    }

    await prisma.empresaPlanilla.delete({
      where: { EPID: parseInt(id) },
    });

    res.json({ message: 'Producto eliminado de la empresa correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto de empresa' });
  }
});

export default router;
