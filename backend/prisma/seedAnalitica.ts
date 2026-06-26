import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Poblando datos de prueba para analítica...\n');

  // Obtener un usuario existente
  const usuario = await prisma.users.findFirst();
  if (!usuario) {
    console.log('❌ No hay usuarios en la base de datos. Crea uno primero.');
    return;
  }
  console.log('📦 Usando usuario:', usuario.email);

  // Crear 2 empresas adicionales
  const empresa1 = await prisma.empresas.create({
    data: {
      EmpresaTipo: 'Tienda',
      EmpresaNombre: 'Tienda Express Centro',
      EmpresaDescripcion: 'Tienda de frutas y verduras',
      EmpresaCreaUsuario: usuario.id,
      EmpresaEstado: 'A',
      EmpresaPlanilla: true,
    }
  });
  console.log('✅ Empresa creada:', empresa1.EmpresaNombre);

  const empresa2 = await prisma.empresas.create({
    data: {
      EmpresaTipo: 'Minimarket',
      EmpresaNombre: 'Minimarket Norte',
      EmpresaDescripcion: 'Minimarket con productos orgánicos',
      EmpresaCreaUsuario: usuario.id,
      EmpresaEstado: 'A',
      EmpresaPlanilla: true,
    }
  });
  console.log('✅ Empresa creada:', empresa2.EmpresaNombre);

  // Obtener productos existentes o crear algunos
  let productos = await prisma.productos.findMany({ take: 5 });
  
  if (productos.length === 0) {
    const producto1 = await prisma.productos.create({
      data: { ProductoNombre: 'Frutas Varias', ProductoActivo: true }
    });
    const producto2 = await prisma.productos.create({
      data: { ProductoNombre: 'Verduras Frescas', ProductoActivo: true }
    });
    const producto3 = await prisma.productos.create({
      data: { ProductoNombre: 'Jugos Naturales', ProductoActivo: true }
    });
    const producto4 = await prisma.productos.create({
      data: { ProductoNombre: 'Hierbas Orgánicas', ProductoActivo: true }
    });
    productos = [producto1, producto2, producto3, producto4];
    console.log('✅ Productos creados');
  } else {
    console.log('📦 Usando productos existentes:', productos.length);
  }

  // Crear planillas de los últimos 7 días
  const hoy = new Date();
  let planillasCreadas = 0;

  for (let i = 6; i >= 0; i--) {
    const fechaPlanilla = new Date(hoy);
    fechaPlanilla.setDate(hoy.getDate() - i);
    fechaPlanilla.setHours(10, 0, 0, 0);

    // Planilla para empresa 1
    const planilla1 = await prisma.planilla.create({
      data: {
        PlanillaFecha: fechaPlanilla,
        PlanillaPuntoVenta: empresa1.EmpresaID,
        PlanillaCreaUsuario: usuario.id,
        PlanillaVentaBruta: Math.floor(Math.random() * 500000) + 200000,
        PlanillaVentaNeta: Math.floor(Math.random() * 400000) + 150000,
        PlanillaVentaEfectivo: Math.floor(Math.random() * 300000) + 100000,
        PlanillaVentaBancos: Math.floor(Math.random() * 200000) + 50000,
        PlanillaEstado: 'C',
      }
    });

    for (const producto of productos) {
      await prisma.planillaDetalle.create({
        data: {
          PlanillaID: planilla1.PlanillaID,
          PDProducto: producto.ProductoID,
          PDCantInicial: Math.floor(Math.random() * 50) + 20,
          PDCantCompra: Math.floor(Math.random() * 30) + 10,
          PDCantAjuste: Math.floor(Math.random() * 5),
          PDCantSubtotal: Math.floor(Math.random() * 60) + 30,
          PDCantVenta: Math.floor(Math.random() * 40) + 15,
          PDCantValor: Math.floor(Math.random() * 80000) + 30000,
          PDCantFinal: Math.floor(Math.random() * 30) + 10,
          PDUsuarioReg: usuario.id,
        }
      });
    }

    await prisma.planillaOtros.create({
      data: {
        PlanillaID: planilla1.PlanillaID,
        PODescripcion: 'Gastos varios',
        POValor: Math.floor(Math.random() * 50000) + 20000,
        POCategoria: 'Gastos',
        POUsuarioReg: usuario.id,
      }
    });

    await prisma.planillaOtros.create({
      data: {
        PlanillaID: planilla1.PlanillaID,
        PODescripcion: 'Ventas Nequi',
        POValor: Math.floor(Math.random() * 100000) + 30000,
        POCategoria: 'Nequi',
        POUsuarioReg: usuario.id,
      }
    });

    // Planilla para empresa 2
    const planilla2 = await prisma.planilla.create({
      data: {
        PlanillaFecha: fechaPlanilla,
        PlanillaPuntoVenta: empresa2.EmpresaID,
        PlanillaCreaUsuario: usuario.id,
        PlanillaVentaBruta: Math.floor(Math.random() * 400000) + 150000,
        PlanillaVentaNeta: Math.floor(Math.random() * 350000) + 100000,
        PlanillaVentaEfectivo: Math.floor(Math.random() * 250000) + 80000,
        PlanillaVentaBancos: Math.floor(Math.random() * 150000) + 40000,
        PlanillaEstado: 'C',
      }
    });

    for (const producto of productos.slice(0, 3)) {
      await prisma.planillaDetalle.create({
        data: {
          PlanillaID: planilla2.PlanillaID,
          PDProducto: producto.ProductoID,
          PDCantInicial: Math.floor(Math.random() * 40) + 15,
          PDCantCompra: Math.floor(Math.random() * 25) + 8,
          PDCantAjuste: Math.floor(Math.random() * 3),
          PDCantSubtotal: Math.floor(Math.random() * 50) + 25,
          PDCantVenta: Math.floor(Math.random() * 35) + 12,
          PDCantValor: Math.floor(Math.random() * 60000) + 25000,
          PDCantFinal: Math.floor(Math.random() * 25) + 8,
          PDUsuarioReg: usuario.id,
        }
      });
    }

    await prisma.planillaOtros.create({
      data: {
        PlanillaID: planilla2.PlanillaID,
        PODescripcion: 'Compras proveedor',
        POValor: Math.floor(Math.random() * 40000) + 15000,
        POCategoria: 'Compras',
        POUsuarioReg: usuario.id,
      }
    });

    await prisma.planillaOtros.create({
      data: {
        PlanillaID: planilla2.PlanillaID,
        PODescripcion: 'Pagos Daviplata',
        POValor: Math.floor(Math.random() * 80000) + 25000,
        POCategoria: 'Daviplata',
        POUsuarioReg: usuario.id,
      }
    });

    planillasCreadas += 2;
    console.log(`  📅 ${fechaPlanilla.toLocaleDateString()}: 2 planillas creadas`);
  }

  console.log('\n✅ Seed completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Resumen:`);
  console.log(`   - Empresas creadas: 2`);
  console.log(`   - Planillas creadas: ${planillasCreadas} (7 días x 2 empresas)`);
  console.log(`   - Ve a /analitica para ver los datos`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
