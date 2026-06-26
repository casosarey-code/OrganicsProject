import prisma from '../config/db';

export class PlanillaService {
  async findAll(filters: { fecha?: string; puntoVenta?: number; estado?: string }) {
    const where: any = {};
    if (filters.fecha) where.PlanillaFecha = { contains: filters.fecha };
    if (filters.puntoVenta) where.PlanillaPuntoVenta = filters.puntoVenta;
    if (filters.estado) where.PlanillaEstado = filters.estado;

    return prisma.planilla.findMany({
      where,
      include: {
        puntoVenta: true,
        creador: { select: { id: true, fullName: true, email: true } },
        _count: { select: { detalles: true, otros: true } },
      },
      orderBy: { PlanillaFecha: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.planilla.findUnique({
      where: { PlanillaID: id },
      include: {
        puntoVenta: true,
        creador: { select: { id: true, fullName: true, email: true } },
        aprobUser: { select: { id: true, fullName: true } },
        detalles: { include: { producto: true } },
        otros: true,
      },
    });
  }

  async create(data: any, userId: string) {
    // Obtener productos de la empresa desde EmpresaPlanilla
    const empresaProductos = await prisma.empresaPlanilla.findMany({
      where: {
        EmpresaID: data.PlanillaPuntoVenta,
        EPActivo: true,
      },
      include: {
        producto: true,
      },
    });

    // Si hay productos en EmpresaPlanilla, clonararlos como detalles
    // Si el usuario envió detalles personalizados, usarlos (sobrescriben los clonados)
    let detallesData: any[] = [];
    
    if (empresaProductos.length > 0) {
      // Clonar desde EmpresaPlanilla con valores por defecto
      detallesData = empresaProductos.map((ep) => ({
        PDProducto: ep.EPProducto,
        PDCantInicial: 0,
        PDCantCompra: 0,
        PDCantAjuste: 0,
        PDCantSubtotal: 0,
        PDCantVenta: 0,
        PDCantValor: ep.EPValorProducto || 0, // Usar el precio personalizado de la empresa
        PDCantFinal: 0,
        PDUsuarioReg: userId,
      }));
    }

    // Si el usuario envió detalles personalizados, agregarlos (o sobrescribir los clonados)
    if (data.detalles && data.detalles.length > 0) {
      // Agregar solo productos que el usuario específicamente incluyó
      data.detalles.forEach((d: any) => {
        const index = detallesData.findIndex((det) => det.PDProducto === d.PDProducto);
        if (index >= 0) {
          // Actualizar con los valores del usuario
          detallesData[index] = {
            ...detallesData[index],
            PDCantInicial: d.PDCantInicial || 0,
            PDCantCompra: d.PDCantCompra || 0,
            PDCantAjuste: d.PDCantAjuste || 0,
            PDCantSubtotal: (d.PDCantInicial || 0) + (d.PDCantCompra || 0) - (d.PDCantAjuste || 0),
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || detallesData[index].PDCantValor,
            PDCantFinal: ((d.PDCantInicial || 0) + (d.PDCantCompra || 0) - (d.PDCantAjuste || 0)) - (d.PDCantVenta || 0),
          };
        } else {
          // Agregar nuevo producto no clonado
          detallesData.push({
            PDProducto: d.PDProducto,
            PDCantInicial: d.PDCantInicial || 0,
            PDCantCompra: d.PDCantCompra || 0,
            PDCantAjuste: d.PDCantAjuste || 0,
            PDCantSubtotal: (d.PDCantInicial || 0) + (d.PDCantCompra || 0) - (d.PDCantAjuste || 0),
            PDCantVenta: d.PDCantVenta || 0,
            PDCantValor: d.PDCantValor || 0,
            PDCantFinal: ((d.PDCantInicial || 0) + (d.PDCantCompra || 0) - (d.PDCantAjuste || 0)) - (d.PDCantVenta || 0),
            PDUsuarioReg: userId,
          });
        }
      });
    }

    return prisma.planilla.create({
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : new Date(),
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaCreaUsuario: userId,
        PlanillaVentaBruta: data.PlanillaVentaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo,
        PlanillaVentaBancos: data.PlanillaVentaBancos,
        PlanillaVentaNeta: data.PlanillaVentaNeta,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
        detalles: detallesData.length > 0 ? {
          create: detallesData,
        } : undefined,
        otros: data.otros ? {
          create: data.otros.map((o: any) => ({
            PODescripcion: o.PODescripcion,
            POValor: o.POValor,
            POCategoria: o.POCategoria,
            POUrlEvidencia: o.POUrlEvidencia,
            POUsuarioReg: userId,
          })),
        } : undefined,
      },
      include: { detalles: true, otros: true },
    });
  }

  async update(id: number, data: any) {
    return prisma.planilla.update({
      where: { PlanillaID: id },
      data: {
        PlanillaFecha: data.PlanillaFecha ? new Date(data.PlanillaFecha) : undefined,
        PlanillaPuntoVenta: data.PlanillaPuntoVenta,
        PlanillaVentaBruta: data.PlanillaVentaBruta,
        PlanillaVentaEfectivo: data.PlanillaVentaEfectivo,
        PlanillaVentaBancos: data.PlanillaVentaBancos,
        PlanillaVentaNeta: data.PlanillaVentaNeta,
        PlanillaVentaBOLD: data.PlanillaVentaBOLD,
        PlanillaVentaNEQUI: data.PlanillaVentaNEQUI,
        PlanillaVentaDAVIPLATA: data.PlanillaVentaDAVIPLATA,
        PlanillaVentaQR: data.PlanillaVentaQR,
      },
      include: { detalles: true, otros: true },
    });
  }

  async delete(id: number) {
    return prisma.planilla.delete({
      where: { PlanillaID: id },
    });
  }

  async getResumen(planillaId: number) {
    return prisma.planilla.findUnique({
      where: { PlanillaID: planillaId },
      select: {
        PlanillaID: true,
        PlanillaFecha: true,
        puntoVenta: { select: { EmpresaNombre: true } },
        creador: { select: { fullName: true } },
        detalles: {
          select: {
            PDCantValor: true,
          },
        },
        otros: {
          select: {
            POValor: true,
            POCategoria: true,
          },
        },
        _count: {
          select: { detalles: true, otros: true },
        },
      },
    });
  }
}

export const planillaService = new PlanillaService();
