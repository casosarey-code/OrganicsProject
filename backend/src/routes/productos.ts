import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';
import { z } from 'zod';

const router = Router();

const createProductoSchema = z.object({
  ProductoNombre: z.string().min(1).max(200),
  ProductoCodigo: z.string().max(50).optional(),
  ProductoPrecio: z.number().min(0).default(0),
  ProductoStock: z.number().int().min(0).default(0),
  ProductoActivo: z.boolean().optional(),
});

const updateProductoSchema = createProductoSchema.partial();

router.use(authJwt);

router.get('/', validatePermission('productos_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { activo } = req.query;

    const where: any = {};
    if (activo !== undefined) where.ProductoActivo = activo === 'true';

    const productos = await prisma.productos.findMany({
      where,
      orderBy: { ProductoNombre: 'asc' },
    });

    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

router.get('/:id', validatePermission('productos_read'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const producto = await prisma.productos.findUnique({
      where: { ProductoID: parseInt(id) },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

router.post('/', validatePermission('productos_create'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createProductoSchema.parse(req.body);

    if (data.ProductoCodigo) {
      const existing = await prisma.productos.findUnique({
        where: { ProductoCodigo: data.ProductoCodigo },
      });
      if (existing) {
        res.status(400).json({ error: 'El código de producto ya existe' });
        return;
      }
    }

    const producto = await prisma.productos.create({
      data: {
        ProductoNombre: data.ProductoNombre,
        ProductoCodigo: data.ProductoCodigo,
        ProductoPrecio: data.ProductoPrecio,
        ProductoStock: data.ProductoStock,
        ProductoActivo: data.ProductoActivo ?? true,
      },
    });

    res.status(201).json(producto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', validatePermission('productos_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.ProductoCodigo) {
      const existing = await prisma.productos.findFirst({
        where: {
          ProductoCodigo: data.ProductoCodigo,
          NOT: { ProductoID: parseInt(id) },
        },
      });
      if (existing) {
        res.status(400).json({ error: 'El código de producto ya existe' });
        return;
      }
    }

    const producto = await prisma.productos.update({
      where: { ProductoID: parseInt(id) },
      data,
    });

    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.patch('/:id/toggle-status', validatePermission('productos_create'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const producto = await prisma.productos.findUnique({
      where: { ProductoID: parseInt(id) },
      select: { ProductoActivo: true },
    });

    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    await prisma.productos.update({
      where: { ProductoID: parseInt(id) },
      data: { ProductoActivo: !producto.ProductoActivo },
    });

    res.json({ message: `Producto ${producto.ProductoActivo ? 'desactivado' : 'activado'} correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado de producto' });
  }
});

router.delete('/:id', validatePermission('productos_delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.productos.delete({
      where: { ProductoID: parseInt(id) },
    });

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
