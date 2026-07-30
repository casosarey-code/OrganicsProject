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

export default router;
ENDOFFILE
