import { Router, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';

const router = Router();

router.use(authJwt);

// POST /api/empresa-productos/importar - Importar productos por empresa
router.post('/', validatePermission('empresa_planilla_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresaId, productos } = req.body;
    const userId = req.user?.userId;

    if (!empresaId) {
      res.status(400).json({ error: 'EmpresaID es requerido' });
      return;
    }

    if (!Array.isArray(productos)) {
      res.status(400).json({ error: 'Se esperaba un array de productos' });
      return;
    }

    // Verificar si el usuario tiene acceso a esta empresa
    const requestingUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { UserEmpresaID: true }
    });

    const userPermissions = (req as any).permissions || [];
    const hasPermission = userPermissions.includes('empresa_planilla_update') || userPermissions.includes('empresas_update');
    const isOwnEmpresa = requestingUser?.UserEmpresaID === empresaId;

    if (!hasPermission && !isOwnEmpresa) {
      res.status(403).json({ error: 'No tienes permiso para modificar productos de esta empresa' });
      return;
    }

    // Verificar que la empresa existe
    const empresa = await prisma.empresas.findUnique({
      where: { EmpresaID: empresaId }
    });

    if (!empresa) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const resultados = {
      creados: 0,
      actualizados: 0,
      errores: [] as { fila: number; error: string }[]
    };

    for (let i = 0; i < productos.length; i++) {
      const item = productos[i];
      
      try {
        let productoId: number | null = null;
        let foundProductoId: number | undefined = undefined;

        // Buscar producto por ID o por código
        if (item.ProductoID) {
          productoId = item.ProductoID;
          foundProductoId = item.ProductoID;
        } else if (item.ProductoCodigo) {
          const producto = await prisma.productos.findUnique({
            where: { ProductoCodigo: item.ProductoCodigo }
          });
          if (!producto) {
            resultados.errores.push({ fila: i + 1, error: `Producto con código '${item.ProductoCodigo}' no encontrado` });
            continue;
          }
          productoId = producto.ProductoID;
          foundProductoId = producto.ProductoID;
        } else {
          resultados.errores.push({ fila: i + 1, error: 'ProductoID o ProductoCodigo es requerido' });
          continue;
        }

        if (foundProductoId === undefined) {
          resultados.errores.push({ fila: i + 1, error: 'No se pudo determinar el ID del producto' });
          continue;
        }

        // Verificar si ya existe el registro
        const existente = await prisma.empresaPlanilla.findUnique({
          where: {
            EmpresaID_EPProducto: {
              EmpresaID: empresaId,
              EPProducto: foundProductoId
            }
          }
        });

        const valorProducto = item.EPValorProducto ? parseFloat(item.EPValorProducto) : 0;
        const activo = item.EPActivo !== undefined ? item.EPActivo : true;

        if (existente) {
          // Actualizar
          await prisma.empresaPlanilla.update({
            where: { EPID: existente.EPID },
            data: {
              EPValorProducto: valorProducto,
              EPActivo: activo
            }
          });
          resultados.actualizados++;
        } else {
          // Crear (foundProductoId ya está verificado como no undefined)
          await prisma.empresaPlanilla.create({
            data: {
              EmpresaID: empresaId,
              EPProducto: foundProductoId!,
              EPValorProducto: valorProducto,
              EPCreaUsuario: userId || '',
              EPActivo: activo
            }
          });
          resultados.creados++;
        }
      } catch (err: any) {
        resultados.errores.push({ fila: i + 1, error: err.message || 'Error desconocido' });
      }
    }

    res.json({
      mensaje: `Importación completada: ${resultados.creados} creados, ${resultados.actualizados} actualizados`,
      ...resultados
    });

  } catch (error) {
    console.error('Error en importación de productos por empresa:', error);
    res.status(500).json({ error: 'Error al importar productos por empresa' });
  }
});

// GET /api/empresa-productos/importar/plantilla - Descargar plantilla CSV
router.get('/plantilla', authJwt, async (req: Request, res: Response) => {
  const csv = 'ProductoCodigo,EPValorProducto,EPActivo\n"COD-001",1000,true\n"COD-002",2000,true';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_empresa_productos.csv');
  res.send(csv);
});

export default router;
