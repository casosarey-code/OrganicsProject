#!/bin/bash
cat > /opt/backend/src/routes/productoComposicion.ts << 'ENDOFFILE'
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
  PCEmpresa: z.number().int().positive().optional().nullable(),
});

const updateComposicionSchema = z.object({
  PCCantidad: z.number().min(0.0001),
  PCEmpresa: z.number().int().positive().optional().nullable(),
});

router.use(authJwt);

// GET /api/productos/composicion - Listar todas las composiciones
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { empresaId } = req.query;
    const empresaNum = empresaId ? parseInt(empresaId as string) : null;
    
    let composiciones;
    
    if (empresaNum) {
      const composicionesEmpresa = await prisma.productoComposicion.findMany({
        where: { PCEmpresa: empresaNum },
        include: {
          producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        },
        orderBy: { PCID: 'desc' },
      });
      
      if (composicionesEmpresa.length > 0) {
        composiciones = composicionesEmpresa;
      } else {
        composiciones = await prisma.productoComposicion.findMany({
          where: { PCEmpresa: null },
          include: {
            producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
            componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          },
          orderBy: { PCID: 'desc' },
        });
      }
    } else {
      composiciones = await prisma.productoComposicion.findMany({
        include: {
          producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
          componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        },
        orderBy: { PCID: 'desc' },
      });
    }
    
    res.json(composiciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar composiciones' });
  }
});

// POST /api/productos/composicion - Crear nueva composición
router.post('/', validatePermission('configuracion_composiciones_crear'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createComposicionSchema.parse(req.body);
    
    // Verificar si ya existe
    const existente = await prisma.productoComposicion.findFirst({
      where: {
        PCProducto: data.PCProducto,
        PCComponente: data.PCComponente,
        PCEmpresa: data.PCEmpresa ?? null,
      },
    });
    
    if (existente) {
      return res.status(400).json({ error: 'Ya existe una composición para este par de productos' });
    }
    
    const composicion = await prisma.productoComposicion.create({
      data: {
        PCProducto: data.PCProducto,
        PCComponente: data.PCComponente,
        PCCantidad: data.PCCantidad,
        PCEmpresa: data.PCEmpresa ?? null,
      },
      include: {
        producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
      },
    });
    
    res.status(201).json(composicion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear composición' });
  }
});

// PUT /api/productos/composicion/:id - Actualizar composición
router.put('/:id', validatePermission('configuracion_composiciones_editar'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateComposicionSchema.parse(req.body);
    
    const composicion = await prisma.productoComposicion.update({
      where: { PCID: id },
      data: {
        PCCantidad: data.PCCantidad,
        PCEmpresa: data.PCEmpresa ?? null,
      },
      include: {
        producto: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
        componente: { select: { ProductoID: true, ProductoNombre: true, ProductoActivo: true } },
      },
    });
    
    res.json(composicion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar composición' });
  }
});

// DELETE /api/productos/composicion/:id - Eliminar composición
router.delete('/:id', validatePermission('configuracion_composiciones_eliminar'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.productoComposicion.delete({
      where: { PCID: id },
    });
    
    res.json({ message: 'Composición eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar composición' });
  }
});

export default router;
ENDOFFILE
