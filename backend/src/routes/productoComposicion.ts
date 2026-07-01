import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt, AuthRequest } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { z } from 'zod';

const router = Router();

const createComposicionSchema = z.object({
  PCProducto: z.number().int().positive(),
  PCComponente: z.number().int().positive(),
  PCCantidad: z.number().min(0.0001),
});

const updateComposicionSchema = z.object({
  PCCantidad: z.number().min(0.0001),
});

router.use(authJwt);

// GET - Listar todas las composiciones
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const composiciones = await prisma.productoComposicion.findMany({
      include: {
        producto: {
          select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true }
        },
        componente: {
          select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true }
        },
      },
      orderBy: { PCID: 'desc' },
    });
    res.json(composiciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar composiciones' });
  }
});

// GET - Obtener composiciones de un producto
router.get('/producto/:productoId', async (req: AuthRequest, res: Response) => {
  try {
    const { productoId } = req.params;
    const composiciones = await prisma.productoComposicion.findMany({
      where: { PCProducto: parseInt(productoId) },
      include: {
        componente: {
          select: { ProductoID: true, ProductoNombre: true }
        },
      },
    });
    res.json(composiciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener composiciones' });
  }
});

// POST - Crear composición
router.post('/', validatePermission('productos_create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createComposicionSchema.parse(req.body);
    
    // Verificar que el producto y componente existan
    const [producto, componente] = await Promise.all([
      prisma.productos.findUnique({ where: { ProductoID: data.PCProducto } }),
      prisma.productos.findUnique({ where: { ProductoID: data.PCComponente } }),
    ]);

    if (!producto || !componente) {
      res.status(400).json({ error: 'Producto o componente no encontrado' });
      return;
    }

    // Verificar que no exista la misma composición
    const existente = await prisma.productoComposicion.findUnique({
      where: {
        PCProducto_PCComponente: {
          PCProducto: data.PCProducto,
          PCComponente: data.PCComponente,
        },
      },
    });

    if (existente) {
      res.status(400).json({ error: 'Esta composición ya existe' });
      return;
    }

    const composicion = await prisma.productoComposicion.create({
      data: {
        PCProducto: data.PCProducto,
        PCComponente: data.PCComponente,
        PCCantidad: data.PCCantidad,
      },
      include: {
        producto: { select: { ProductoID: true, ProductoNombre: true } },
        componente: { select: { ProductoID: true, ProductoNombre: true } },
      },
    });

    res.status(201).json(composicion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear composición' });
  }
});

// PUT - Actualizar composición
router.put('/:id', validatePermission('productos_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateComposicionSchema.parse(req.body);

    const composicion = await prisma.productoComposicion.update({
      where: { PCID: parseInt(id) },
      data: { PCCantidad: data.PCCantidad },
      include: {
        producto: { select: { ProductoID: true, ProductoNombre: true } },
        componente: { select: { ProductoID: true, ProductoNombre: true } },
      },
    });

    res.json(composicion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar composición' });
  }
});

// DELETE - Eliminar composición
router.delete('/:id', validatePermission('productos_delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productoComposicion.delete({
      where: { PCID: parseInt(id) },
    });
    res.json({ message: 'Composición eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar composición' });
  }
});

export default router;
