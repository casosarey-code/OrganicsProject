import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';
import prisma from '../config/db';

const router = Router();

// GET - Obtener datos analíticos
router.get('/', authJwt, validatePermission('analitica_read'), async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const day = req.query.day ? parseInt(req.query.day as string) : undefined;
    const estado = req.query.estado as string || undefined;
    const puntoVentaId = req.query.puntoVentaId ? parseInt(req.query.puntoVentaId as string) : undefined;

    // Totales de ventas - Por defecto filtra por estado D (Revisada)
    const whereBase: any = {};
    if (year) {
      whereBase.PlanillaFecha = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    if (month && year) {
      whereBase.PlanillaFecha = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    }
    if (day && year && month) {
      whereBase.PlanillaFecha = { gte: new Date(year, month - 1, day), lt: new Date(year, month - 1, day + 1) };
    }
    if (puntoVentaId) whereBase.PlanillaPuntoVenta = puntoVentaId;
    // Si no se especifica estado, usar D (Revisada) por defecto
    whereBase.PlanillaEstado = estado || 'D';

    console.log('Query analítica - where:', JSON.stringify(whereBase));

    const planillas = await prisma.planilla.findMany({ where: whereBase });
    console.log('Planillas encontradas:', planillas.length);
    const totalVentas = planillas.reduce((sum, p) => sum + Number(p.PlanillaVentaBruta || 0), 0);

    // Costos
    const planillaIds = planillas.map(p => p.PlanillaID);
    const otros = await prisma.planillaOtros.findMany({
      where: { PlanillaID: { in: planillaIds }, POCategoria: { in: ['Gastos', 'Compras', 'Turnos', 'Memorias'] } }
    });
    const totalCostos = otros.reduce((sum, o) => sum + Number(o.POValor || 0), 0);
    const totalGanancias = totalVentas - totalCostos;

    // Tendencia de ventas (filtrar por estado D - Revisada)
    const tendenciasWhere: any = { PlanillaEstado: 'D' };
    if (puntoVentaId) tendenciasWhere.PlanillaPuntoVenta = puntoVentaId;

    const tendenciasPlanillas = await prisma.planilla.findMany({
      where: tendenciasWhere,
      select: { PlanillaFecha: true, PlanillaVentaBruta: true }
    });

    // Agrupar por día
    const ventasPorDia: { [key: string]: number } = {};
    tendenciasPlanillas.forEach(p => {
      const fecha = p.PlanillaFecha.toISOString().split('T')[0];
      ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + Number(p.PlanillaVentaBruta || 0);
    });
    const tendenciaDias = Object.entries(ventasPorDia)
      .map(([fecha, ventas]) => ({ fecha, ventas }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Productos más vendidos (filtrar por estado D - Revisada)
    const detallesWhere: any = { planilla: { PlanillaEstado: 'D' } };
    if (year) detallesWhere.planilla = { ...detallesWhere.planilla, PlanillaFecha: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } };
    if (month && year) detallesWhere.planilla = { ...detallesWhere.planilla, PlanillaFecha: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } };
    if (puntoVentaId) detallesWhere.planilla = { ...detallesWhere.planilla, PlanillaPuntoVenta: puntoVentaId };

    const productosRaw = await prisma.planillaDetalle.groupBy({
      by: ['PDProducto'],
      _sum: { PDCantVenta: true, PDCantValor: true },
      where: detallesWhere,
      orderBy: { _sum: { PDCantValor: 'desc' } },
      take: 10
    });

    const productosIds = productosRaw.map(p => p.PDProducto);
    const productos = await prisma.productos.findMany({ where: { ProductoID: { in: productosIds } } });
    const productosMap: any = {};
    productos.forEach((p: any) => { productosMap[p.ProductoID] = p; });

    const productosMasVendidos = productosRaw.map(p => ({
      producto: productosMap[p.PDProducto]?.ProductoNombre || 'Desconocido',
      cantidad: Number(p._sum.PDCantVenta || 0),
      valor: Number(p._sum.PDCantValor || 0)
    }));

    // Pagos por categoría (gráfica de torta) - filtrar por estado D - Revisada
    const pagosPorCategoriaRaw = await prisma.planillaOtros.groupBy({
      by: ['POCategoria'],
      _sum: { POValor: true },
      where: {
        POCategoria: { in: ['Daviplata', 'Nequi', 'QR', 'Bold', 'Datafono'] },
        planilla: { PlanillaEstado: 'D' }
      }
    });

    const totalPagos = pagosPorCategoriaRaw.reduce((sum, p) => sum + Number(p._sum.POValor || 0), 0);
    const pagosPorCategoria = pagosPorCategoriaRaw.map(p => ({
      categoria: p.POCategoria,
      valor: Number(p._sum.POValor || 0),
      porcentaje: totalPagos > 0 ? Math.round((Number(p._sum.POValor || 0) / totalPagos) * 100) : 0
    }));

    // Tendencia de pagos por día (filtrar por estado D - Revisada)
    const pagosWhere: any = {
      POCategoria: { in: ['Daviplata', 'Nequi', 'QR', 'Bold', 'Datafono'] },
      planilla: { PlanillaEstado: 'D' }
    };
    if (puntoVentaId) pagosWhere.planilla = { ...pagosWhere.planilla, PlanillaPuntoVenta: puntoVentaId };

    const pagosRaw = await prisma.planillaOtros.findMany({
      where: pagosWhere,
      include: { planilla: { select: { PlanillaFecha: true } } }
    });

    const pagosPorDia: { [key: string]: number } = {};
    pagosRaw.forEach(p => {
      const fecha = p.planilla.PlanillaFecha.toISOString().split('T')[0];
      pagosPorDia[fecha] = (pagosPorDia[fecha] || 0) + Number(p.POValor || 0);
    });
    const tendenciaPagos = Object.entries(pagosPorDia)
      .map(([fecha, pagos]) => ({ fecha, pagos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Ventas por mes (comparativa) - filtrar por estado D - Revisada
    const allPlanillas = await prisma.planilla.findMany({
      where: { PlanillaEstado: 'D' },
      select: { PlanillaFecha: true, PlanillaVentaBruta: true },
      orderBy: { PlanillaFecha: 'asc' }
    });

    const ventasPorMes: { [key: string]: number } = {};
    allPlanillas.forEach(p => {
      const mes = p.PlanillaFecha.toISOString().substring(0, 7); // YYYY-MM
      ventasPorMes[mes] = (ventasPorMes[mes] || 0) + Number(p.PlanillaVentaBruta || 0);
    });
    
    const comparativaMeses = Object.entries(ventasPorMes)
      .map(([mes, ventas]) => ({
        mes,
        mesNombre: new Date(mes + '-01').toLocaleString('es', { month: 'short', year: 'numeric' }),
        ventas
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Últimos 12 meses

    // Máxima venta (filtrar por estado D - Revisada)
    const maxVentaRaw = await prisma.planilla.findMany({
      where: { PlanillaEstado: 'D' },
      select: { PlanillaFecha: true, PlanillaVentaBruta: true },
      orderBy: { PlanillaVentaBruta: 'desc' },
      take: 1
    });

    const maxVentaDia = maxVentaRaw[0] ? {
      maxVenta: Number(maxVentaRaw[0].PlanillaVentaBruta),
      fecha: maxVentaRaw[0].PlanillaFecha.toISOString().split('T')[0]
    } : null;

    res.json({
      totales: { ventas: totalVentas, costos: totalCostos, ganancias: totalGanancias },
      tendenciaDias,
      productosMasVendidos,
      tendenciaPagos,
      pagosPorCategoria,
      comparativaMeses,
      maxVentaDia,
      resumen: []
    });
  } catch (error: any) {
    console.error('Error en analítica:', error);
    res.status(500).json({ error: error.message || 'Error al obtener analítica' });
  }
});

// GET - Exportar datos para Excel específico (por días del mes)
router.get('/export-excel', authJwt, validatePermission('analitica_read'), async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const puntoVentaId = req.query.puntoVentaId ? parseInt(req.query.puntoVentaId as string) : undefined;

    // Determinar rango de fechas
    let fechaInicio: Date;
    let fechaFin: Date;
    const mesNombre = month ? new Date(year, month - 1, 1).toLocaleString('es', { month: 'long' }) : 'Año completo';

    if (month) {
      // Mes específico
      fechaInicio = new Date(year, month - 1, 1);
      fechaFin = new Date(year, month, 1);
    } else {
      // Año completo
      fechaInicio = new Date(year, 0, 1);
      fechaFin = new Date(year + 1, 0, 1);
    }

    // Obtener planillas del período seleccionado (filtrar por estado D - Revisada)
    const whereBase: any = {
      PlanillaFecha: {
        gte: fechaInicio,
        lt: fechaFin,
      },
      PlanillaEstado: 'D', // Solo planillas revisadas
    };
    if (puntoVentaId) whereBase.PlanillaPuntoVenta = puntoVentaId;
    const planillas = await prisma.planilla.findMany({
      where: whereBase,
      include: {
        puntoVenta: { select: { EmpresaNombre: true } },
      },
    });

    // Obtener pagos por categoría
    const planillaIds = planillas.map(p => p.PlanillaID);
    const pagos = await prisma.planillaOtros.findMany({
      where: {
        PlanillaID: { in: planillaIds },
        POCategoria: { in: ['Daviplata', 'Nequi', 'QR', 'Bold', 'Datafono', 'Efectivo'] },
      },
    });

    // Agrupar por día
    const diasEnMes = month ? new Date(year, month, 0).getDate() : 31;
    const datosPorDia: { [dia: number]: { fecha: string; ventasBrutas: number; ventasNetas: number; bold: number; nequi: number; daviplata: number; qr: number; datafono: number; efectivo: number } } = {};

    // Inicializar días
    for (let i = 1; i <= diasEnMes; i++) {
      datosPorDia[i] = {
        fecha: `${i.toString().padStart(2, '0')}/${month ? month.toString().padStart(2, '0') : '01'}/${year}`,
        ventasBrutas: 0,
        ventasNetas: 0,
        bold: 0,
        nequi: 0,
        daviplata: 0,
        qr: 0,
        datafono: 0,
        efectivo: 0,
      };
    }

    // Procesar planillas
    for (const planilla of planillas) {
      const dia = new Date(planilla.PlanillaFecha).getDate();
      if (datosPorDia[dia]) {
        datosPorDia[dia].ventasBrutas += Number(planilla.PlanillaVentaBruta || 0);
        datosPorDia[dia].ventasNetas += Number(planilla.PlanillaVentaNeta || planilla.PlanillaVentaBruta || 0);
      }
    }

    // Procesar pagos
    for (const pago of pagos) {
      const planilla = planillas.find(p => p.PlanillaID === pago.PlanillaID);
      if (!planilla) continue;
      const dia = new Date(planilla.PlanillaFecha).getDate();
      if (!datosPorDia[dia]) continue;
      const valor = Number(pago.POValor || 0);

      switch (pago.POCategoria) {
        case 'Bold': datosPorDia[dia].bold += valor; break;
        case 'Nequi': datosPorDia[dia].nequi += valor; break;
        case 'Daviplata': datosPorDia[dia].daviplata += valor; break;
        case 'QR': datosPorDia[dia].qr += valor; break;
        case 'Datafono': datosPorDia[dia].datafono += valor; break;
        case 'Efectivo': datosPorDia[dia].efectivo += valor; break;
      }
    }

    // Convertir a array
    const resultado = Object.entries(datosPorDia)
      .map(([dia, datos]) => ({
        dia: parseInt(dia),
        ...datos,
      }))
      .sort((a, b) => a.dia - b.dia);

    // Calcular sumatoria
    const sumatoria = {
      dia: 0,
      fecha: 'TOTAL',
      ventasBrutas: 0,
      ventasNetas: 0,
      bold: 0,
      nequi: 0,
      daviplata: 0,
      qr: 0,
      datafono: 0,
      efectivo: 0,
    };

    for (const item of resultado) {
      sumatoria.ventasBrutas += item.ventasBrutas;
      sumatoria.ventasNetas += item.ventasNetas;
      sumatoria.bold += item.bold;
      sumatoria.nequi += item.nequi;
      sumatoria.daviplata += item.daviplata;
      sumatoria.qr += item.qr;
      sumatoria.datafono += item.datafono;
      sumatoria.efectivo += item.efectivo;
    }

    res.json({
      year,
      month,
      mesNombre,
      puntoVentaId,
      datos: resultado,
      sumatoria,
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener opciones de filtro
router.get('/opciones', authJwt, validatePermission('analitica_read'), async (req: Request, res: Response) => {
  try {
    // Filtro basado en planillas con estado D (Revisada)
    const yearsResult = await prisma.planilla.findMany({
      where: { PlanillaEstado: 'D' },
      select: { PlanillaFecha: true },
      distinct: ['PlanillaFecha']
    });

    const years = [...new Set(yearsResult.map(p => p.PlanillaFecha.getFullYear()))].sort((a, b) => b - a);

    // Obtener puntos de venta (empresas con planillas revisadas)
    const empresas = await prisma.empresas.findMany({
      include: { planillas: { where: { PlanillaEstado: 'D' }, select: { PlanillaID: true } } },
      where: { planillas: { some: { PlanillaEstado: 'D' } } },
      orderBy: { EmpresaNombre: 'asc' }
    });

    res.json({
      years,
      puntosVenta: empresas.map((e: any) => ({
        PuntoVentaID: e.EmpresaID,
        PuntoVentaNombre: e.EmpresaNombre,
        EmpresaNombre: e.EmpresaNombre
      })),
      filtroInfo: {
        estado: 'D',
        descripcion: 'Revisada',
        mensaje: 'Los filtros muestran datos basados en planillas con estado Revisada (D)'
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener opciones' });
  }
});

export default router;
