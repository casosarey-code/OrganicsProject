import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authJwt, AuthRequest } from '../middleware/authJwt';

const router = Router();

// POST /api/tareas/crear-planillas-masivas
// Crea planillas para todas las empresas activas dentro del rango de fechas
router.post('/crear-planillas-masivas', authJwt, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    console.log('=== INICIANDO TAREA PROGRAMADA: Creación Masiva de Planillas ===');
    console.log('Fecha de ejecución:', new Date().toISOString());

    // 1. Buscar empresas activas que estén dentro del rango de fechas
    const empresas = await prisma.empresas.findMany({
      where: {
        EmpresaEstado: 'A',
        EmpresaPlanilla: true, // Solo empresas que generan planillas
        EmpresaInicioPlantilla: { lte: hoy },
        EmpresaFinPlantilla: { gte: hoy },
      },
      include: {
        empresaProductos: {
          where: { EPActivo: true },
          include: { producto: true },
          orderBy: { EPOrden: 'asc' },
        },
      },
    });

    console.log(`Empresas encontradas: ${empresas.length}`);

    const resultados = {
      exitosas: 0,
      fallidas: 0,
      empresas: [] as string[],
      errores: [] as string[],
    };

    for (const empresa of empresas) {
      try {
        // Verificar si ya existe una planilla para hoy para esta empresa
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        const planillaExistente = await prisma.planilla.findFirst({
          where: {
            PlanillaPuntoVenta: empresa.EmpresaID,
            PlanillaFecha: {
              gte: hoy,
              lt: manana,
            },
          },
        });

        if (planillaExistente) {
          console.log(`Ya existe planilla para ${empresa.EmpresaNombre} en fecha ${hoy.toISOString().split('T')[0]}`);
          continue;
        }

        // 2. Calcular fecha de vencimiento (36 horas desde ahora)
        const fechaVencimiento = new Date();
        fechaVencimiento.setHours(fechaVencimiento.getHours() + 36);

        // 3. Crear la planilla con los datos especificados
        const planilla = await prisma.planilla.create({
          data: {
            PlanillaFecha: new Date(new Date().setHours(6, 0, 0, 0)), // 06:00:00
            PlanillaPuntoVenta: empresa.EmpresaID,
            PlanillaCreaUsuario: userId,
            PlanillaCreaFecha: new Date(),
            PlanillaEstado: 'A', // Abierta
            PlanillaEnvioNotificacion: false, // FALSE
            PlanillaFechaNotificacion: undefined, // NULL (no establecer)
            PlanillaFechaVencimiento: fechaVencimiento, // ServerNow() + 36 horas
            detalles: empresa.empresaProductos.length > 0 ? {
              create: empresa.empresaProductos.map((ep) => ({
                PDProducto: ep.EPProducto,
                PDOrden: ep.EPOrden,
                PDCantInicial: 0,
                PDCantCompra: 0,
                PDCantAjuste: 0,
                PDCantSubtotal: 0,
                PDCantVenta: 0,
                PDCantValor: 0,
                PDCantFinal: 0,
                PDUsuarioReg: userId,
              })),
            } : undefined,
          },
        });

        console.log(`✓ Planilla #${planilla.PlanillaID} creada para ${empresa.EmpresaNombre}`);
        resultados.exitosas++;
        resultados.empresas.push(`${empresa.EmpresaNombre} (ID: ${planilla.PlanillaID})`);
      } catch (error: any) {
        console.error(`✗ Error creando planilla para ${empresa.EmpresaNombre}:`, error.message);
        resultados.fallidas++;
        resultados.errores.push(`${empresa.EmpresaNombre}: ${error.message}`);
      }
    }

    console.log('=== TAREA PROGRAMADA FINALIZADA ===');
    console.log(`Exitosas: ${resultados.exitosas}, Fallidas: ${resultados.fallidas}`);

    res.json({
      message: 'Tarea completada',
      summary: {
        totalEmpresas: empresas.length,
        planillasCreadas: resultados.exitosas,
        fallidas: resultados.fallidas,
      },
      detalles: resultados,
    });
  } catch (error: any) {
    console.error('Error en tarea programada:', error);
    res.status(500).json({ error: error.message || 'Error al ejecutar tarea programada' });
  }
});

// POST /api/tareas/notificar-vencidas
// Envía notificaciones de planillas vencidas manualmente
router.post('/notificar-vencidas', authJwt, async (req: AuthRequest, res: Response) => {
  try {
    console.log('=== INICIANDO: Notificar Planillas Vencidas ===');
    console.log('Fecha de ejecución:', new Date().toISOString());

    // Buscar planillas vencidas que no han sido notificadas
    const planillasVencidas = await prisma.planilla.findMany({
      where: {
        PlanillaFechaVencimiento: {
          lt: new Date(), // Ya venció
        },
        PlanillaEnvioNotificacion: false,
        PlanillaEstado: 'A',
      },
      include: {
        puntoVenta: {
          include: {
            usuarios: true,
          },
        },
      },
    });

    console.log(`Planillas vencidas encontradas: ${planillasVencidas.length}`);

    const resultados = {
      total: planillasVencidas.length,
      enviados: 0,
      errores: 0,
      detalles: [] as any[],
    };

    for (const planilla of planillasVencidas) {
      try {
        const usuarios = planilla.puntoVenta.usuarios;
        
        if (usuarios.length === 0) {
          resultados.detalles.push({
            planillaId: planilla.PlanillaID,
            empresa: planilla.puntoVenta.EmpresaNombre,
            estado: 'SIN_USUARIOS',
          });
          continue;
        }

        // En producción, aquí se enviaría el correo
        // Por ahora solo marcamos como notificada
        await prisma.planilla.update({
          where: { PlanillaID: planilla.PlanillaID },
          data: {
            PlanillaFechaNotificacion: new Date(),
            PlanillaEnvioNotificacion: true,
          },
        });

        resultados.enviados++;
        resultados.detalles.push({
          planillaId: planilla.PlanillaID,
          empresa: planilla.puntoVenta.EmpresaNombre,
          usuariosNotificados: usuarios.length,
          estado: 'OK',
        });
      } catch (error: any) {
        resultados.errores++;
        resultados.detalles.push({
          planillaId: planilla.PlanillaID,
          empresa: planilla.puntoVenta.EmpresaNombre,
          estado: 'ERROR',
          error: error.message,
        });
      }
    }

    console.log('=== FINALIZADO ===');
    console.log(`Total: ${resultados.total}, Enviados: ${resultados.enviados}, Errores: ${resultados.errores}`);

    res.json({
      message: 'Notificación completada',
      ...resultados,
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tareas/estado
// Verificar estado de la última ejecución
router.get('/estado', authJwt, async (req: AuthRequest, res: Response) => {
  try {
    // Obtener última planilla creada
    const ultimaPlanilla = await prisma.planilla.findFirst({
      orderBy: { PlanillaCreaFecha: 'desc' },
      include: {
        puntoVenta: true,
        creador: { select: { fullName: true } },
      },
    });

    // Contar planillas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const planillasHoy = await prisma.planilla.count({
      where: {
        PlanillaFecha: {
          gte: hoy,
          lt: manana,
        },
      },
    });

    // Empresas activas con planillas
    const empresasActivas = await prisma.empresas.count({
      where: {
        EmpresaEstado: 'A',
        EmpresaPlanilla: true,
      },
    });

    res.json({
      ultimaPlanilla,
      estadisticas: {
        planillasHoy,
        empresasActivas,
        cobertura: empresasActivas > 0 ? Math.round((planillasHoy / empresasActivas) * 100) : 0,
      },
      fechaServidor: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
