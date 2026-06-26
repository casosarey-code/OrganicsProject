import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import { AuthRequest } from '../middleware/authJwt';

const router = Router();

router.use(authJwt);

// POST /api/productos/importar - Importar productos desde CSV
router.post('/', validatePermission('productos_update'), async (req: AuthRequest, res: Response) => {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos)) {
      res.status(400).json({ error: 'Se esperaba un array de productos' });
      return;
    }

    const resultados = {
      creados: 0,
      actualizados: 0,
      errores: [] as { fila: number; error: string }[]
    };

    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      
      try {
        // Validar campos requeridos
        if (!producto.ProductoNombre) {
          resultados.errores.push({ fila: i + 1, error: 'ProductoNombre es requerido' });
          continue;
        }

        // Si tiene ProductoID, actualizar; si tiene ProductoCodigo, buscar o crear
        if (producto.ProductoID) {
          await prisma.productos.update({
            where: { ProductoID: producto.ProductoID },
            data: {
              ProductoNombre: producto.ProductoNombre,
              ProductoCodigo: producto.ProductoCodigo || null,
              ProductoPrecio: producto.ProductoPrecio ? parseFloat(producto.ProductoPrecio) : 0,
              ProductoStock: producto.ProductoStock ? parseInt(producto.ProductoStock) : 0,
              ProductoActivo: producto.ProductoActivo !== undefined ? producto.ProductoActivo : true,
            }
          });
          resultados.actualizados++;
        } else if (producto.ProductoCodigo) {
          // Buscar por código
          const existente = await prisma.productos.findUnique({
            where: { ProductoCodigo: producto.ProductoCodigo }
          });

          if (existente) {
            // Actualizar
            await prisma.productos.update({
              where: { ProductoID: existente.ProductoID },
              data: {
                ProductoNombre: producto.ProductoNombre,
                ProductoPrecio: producto.ProductoPrecio ? parseFloat(producto.ProductoPrecio) : existente.ProductoPrecio,
                ProductoStock: producto.ProductoStock !== undefined ? parseInt(producto.ProductoStock) : existente.ProductoStock,
                ProductoActivo: producto.ProductoActivo !== undefined ? producto.ProductoActivo : existente.ProductoActivo,
              }
            });
            resultados.actualizados++;
          } else {
            // Crear nuevo
            await prisma.productos.create({
              data: {
                ProductoNombre: producto.ProductoNombre,
                ProductoCodigo: producto.ProductoCodigo,
                ProductoPrecio: producto.ProductoPrecio ? parseFloat(producto.ProductoPrecio) : 0,
                ProductoStock: producto.ProductoStock ? parseInt(producto.ProductoStock) : 0,
                ProductoActivo: producto.ProductoActivo !== undefined ? producto.ProductoActivo : true,
              }
            });
            resultados.creados++;
          }
        } else {
          // Crear sin código
          await prisma.productos.create({
            data: {
              ProductoNombre: producto.ProductoNombre,
              ProductoCodigo: null,
              ProductoPrecio: producto.ProductoPrecio ? parseFloat(producto.ProductoPrecio) : 0,
              ProductoStock: producto.ProductoStock ? parseInt(producto.ProductoStock) : 0,
              ProductoActivo: producto.ProductoActivo !== undefined ? producto.ProductoActivo : true,
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
    console.error('Error en importación de productos:', error);
    res.status(500).json({ error: 'Error al importar productos' });
  }
});

// GET /api/productos/importar/plantilla - Descargar plantilla CSV
router.get('/plantilla', authJwt, async (req: Request, res: Response) => {
  const csv = 'ProductoNombre,ProductoCodigo,ProductoPrecio,ProductoStock,ProductoActivo\n"Producto Ejemplo","COD-001",1000,50,true';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos.csv');
  res.send(csv);
});

export default router;
