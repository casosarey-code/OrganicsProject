import cron from 'node-cron';
import prisma from '../config/db';

/**
 * Obtiene el N. Final de la última planilla cerrada (estado C o D) para una empresa.
 * Retorna un Map con { productoId: nFinal }
 */
async function obtenerNFinalAnterior(empresaId: number): Promise<Map<number, number>> {
  const nFinalMap = new Map<number, number>();
  
  // Buscar la última planilla enviada o revisada
  const ultimaPlanilla = await prisma.planilla.findFirst({
    where: {
      PlanillaPuntoVenta: empresaId,
      PlanillaEstado: { in: ['C', 'D'] }, // Enviado o Revisado
    },
    orderBy: { PlanillaFecha: 'desc' },
    include: {
      detalles: {
        select: {
          PDProducto: true,
          PDCantFinal: true,
        },
      },
    },
  });
  
  if (ultimaPlanilla) {
    // Llenar el Map con los N. Final
    for (const detalle of ultimaPlanilla.detalles) {
      nFinalMap.set(detalle.PDProducto, Number(detalle.PDCantFinal) || 0);
    }
    console.log(`[SCHEDULER] N. Final de planilla #${ultimaPlanilla.PlanillaID}: ${nFinalMap.size} productos`);
  } else {
    console.log(`[SCHEDULER] No hay planilla anterior para empresa ${empresaId}`);
  }
  
  return nFinalMap;
}

async function crearPlanillasMasivas() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular fecha de ayer para la planilla
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    console.log('=== [SCHEDULER] Iniciando creación masiva de planillas ===');
    console.log('Fecha de ejecución:', new Date().toISOString());
    console.log('Fecha de planilla (ayer):', ayer.toISOString());

    // Buscar usuario admin para asignar como creador
    const adminUser = await prisma.users.findFirst({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: 'admin'
            }
          }
        }
      }
    });

    if (!adminUser) {
      console.error('[SCHEDULER] No se encontró usuario admin para crear planillas');
      return;
    }

    const userId = adminUser.id;

    // Buscar empresas activas dentro del rango de fechas
    const empresas = await prisma.empresas.findMany({
      where: {
        EmpresaEstado: 'A',
        EmpresaPlanilla: true,
        EmpresaInicioPlantilla: { lte: hoy },
        EmpresaFinPlantilla: { gte: hoy },
      },
      include: {
        empresaProductos: {
          where: { EPActivo: true },
          include: { producto: true },
        },
      },
    });

    console.log(`[SCHEDULER] Empresas encontradas: ${empresas.length}`);

    let exitosas = 0;
    let existentes = 0;
    let errores = 0;

    for (const empresa of empresas) {
      try {
        // Verificar si ya existe planilla para ayer
        const manana = new Date(ayer);
        manana.setDate(manana.getDate() + 1);

        const planillaExistente = await prisma.planilla.findFirst({
          where: {
            PlanillaPuntoVenta: empresa.EmpresaID,
            PlanillaFecha: {
              gte: ayer,
              lt: manana,
            },
          },
        });

        if (planillaExistente) {
          console.log(`[SCHEDULER] Ya existe planilla para ${empresa.EmpresaNombre} en fecha ${ayer.toISOString().split('T')[0]}`);
          existentes++;
          continue;
        }

        // Calcular fecha de vencimiento (36 horas)
        const fechaVencimiento = new Date();
        fechaVencimiento.setHours(fechaVencimiento.getHours() + 36);

        // Obtener N. Final de la planilla anterior (estado C o D)
        const nFinalAnterior = await obtenerNFinalAnterior(empresa.EmpresaID);

        // Crear planilla con N. Inicial = N. Final de planilla anterior
        // Y productos SoloContabilidad = 0
        await prisma.planilla.create({
          data: {
            PlanillaFecha: ayer, // Usar fecha de ayer
            PlanillaPuntoVenta: empresa.EmpresaID,
            PlanillaCreaUsuario: userId,
            PlanillaCreaFecha: new Date(),
            PlanillaEstado: 'A',
            PlanillaEnvioNotificacion: false,
            PlanillaFechaVencimiento: fechaVencimiento,
            detalles: empresa.empresaProductos.length > 0 ? {
              create: empresa.empresaProductos.map((ep) => {
                // Si el producto es SoloContabilidad, usar N.Inicial = 0
                const esSoloContabilidad = ep.producto?.ProductoSoloContabilidad === true;
                const nInicial = esSoloContabilidad ? 0 : (nFinalAnterior.get(ep.EPProducto) || 0);
                return {
                  PDProducto: ep.EPProducto,
                  PDCantInicial: nInicial,
                  PDCantCompra: 0,
                  PDCantAjuste: 0,
                  PDCantSubtotal: nInicial,
                  PDCantVenta: 0,
                  PDCantValor: 0,
                  PDCantFinal: nInicial,
                  PDUsuarioReg: userId,
                };
              }),
            } : undefined,
          },
        });

        exitosas++;
        console.log(`[SCHEDULER] ✓ Planilla creada para ${empresa.EmpresaNombre}`);
      } catch (error: any) {
        errores++;
        console.error(`[SCHEDULER] ✗ Error para ${empresa.EmpresaNombre}:`, error.message);
      }
    }

    console.log(`[SCHEDULER] Finalizado - Creadas: ${exitosas}, Ya existían: ${existentes}, Errores: ${errores}`);
  } catch (error: any) {
    console.error('[SCHEDULER] Error general:', error.message);
  }
}

export function initScheduler() {
  // Tarea 1: Crear planillas diarias a las 6:00 AM
  cron.schedule('0 6 * * *', () => {
    crearPlanillasMasivas();
  }, {
    timezone: 'America/Bogota'
  });

  // Tarea 2: Notificar planillas vencidas a las 2:00 PM
  cron.schedule('0 14 * * *', () => {
    notificarPlanillasVencidas();
  }, {
    timezone: 'America/Bogota'
  });

  console.log('[SCHEDULER] Tareas programadas inicializadas:');
  console.log('  - 6:00 AM: Crear planillas masivas');
  console.log('  - 2:00 PM: Notificar planillas vencidas');
}

// Exportar para ejecución manual
export { crearPlanillasMasivas, obtenerNFinalAnterior };

// ============================================
// TAREA: Notificar Planillas Vencidas
// ============================================

import nodemailer from 'nodemailer';
import { Pool } from 'pg';

// Pool de conexión para tablas legacy
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

interface ConfigSMTP {
  SMTPHost: string;
  SMTPPort: number;
  SMTPUsuario: string;
  SMTPPassword: string;
  SMTPFromEmail: string;
  SMTPFromName: string;
  SMTPSecure: string;
  SMTPAuth: boolean;
}

async function enviarCorreoScheduler(destinatario: string, asunto: string, html: string) {
  try {
    // Obtener configuración SMTP activa desde la tabla legacy
    const configResult = await pool.query(
      'SELECT * FROM ConfiguracionSMTP WHERE SMTPActivo = true LIMIT 1'
    );

    if (configResult.rows.length === 0) {
      console.error('[SCHEDULER] No hay configuración SMTP activa');
      return;
    }

    const config: ConfigSMTP = configResult.rows[0];

    const transporter = nodemailer.createTransport({
      host: config.SMTPHost,
      port: config.SMTPPort,
      secure: config.SMTPSecure === 'SSL',
      auth: config.SMTPAuth ? {
        user: config.SMTPUsuario,
        pass: config.SMTPPassword,
      } : undefined,
    });

    await transporter.sendMail({
      from: `"${config.SMTPFromName}" <${config.SMTPFromEmail}>`,
      to: destinatario,
      subject: asunto,
      html,
    });

    console.log(`[SCHEDULER] ✓ Correo enviado a ${destinatario}`);
  } catch (error) {
    console.error('[SCHEDULER] Error enviando correo:', error);
    throw error;
  }
}

async function notificarPlanillasVencidas() {
  try {
    console.log('=== [SCHEDULER] Iniciando notificación de planillas vencidas ===');
    console.log('Fecha de ejecución:', new Date().toISOString());

    // Buscar planillas vencidas que no han sido notificadas
    const planillasVencidas = await prisma.planilla.findMany({
      where: {
        PlanillaFechaVencimiento: {
          lt: new Date(), // Ya venció
        },
        PlanillaEnvioNotificacion: false, // No se ha notificado
        PlanillaEstado: 'A', // Solo abiertas
      },
      include: {
        puntoVenta: {
          include: {
            usuarios: true, // Usuarios de la empresa
          },
        },
        creador: true,
      },
    });

    console.log(`[SCHEDULER] Planillas vencidas encontradas: ${planillasVencidas.length}`);

    let enviados = 0;
    let errores = 0;

    for (const planilla of planillasVencidas) {
      try {
        // Obtener usuarios de la empresa para enviar correo
        const usuarios = planilla.puntoVenta.usuarios;
        
        if (usuarios.length === 0) {
          console.log(`[SCHEDULER] No hay usuarios para ${planilla.puntoVenta.EmpresaNombre}`);
          continue;
        }

        // Enviar correo a cada usuario
        for (const usuario of usuarios) {
          if (!usuario.email) continue;

          const asunto = `⚠️ Planilla vencida - ${planilla.puntoVenta.EmpresaNombre}`;
          const html = `
            <h2>¡Atención!</h2>
            <p>La planilla del <strong>${new Date(planilla.PlanillaFecha).toLocaleDateString('es-CO')}</strong> ha vencido.</p>
            <p><strong>Empresa:</strong> ${planilla.puntoVenta.EmpresaNombre}</p>
            <p><strong>Fecha de vencimiento:</strong> ${new Date(planilla.PlanillaFechaVencimiento!).toLocaleString('es-CO')}</p>
            <p>Por favor complete y envíe la planilla lo antes posible.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/planillas/${planilla.PlanillaID}/editar">Ir a la planilla</a></p>
          `;

          try {
            await enviarCorreoScheduler(usuario.email, asunto, html);
            console.log(`[SCHEDULER] ✓ Correo enviado a ${usuario.email}`);
          } catch (emailError) {
            console.error(`[SCHEDULER] ✗ Error enviando correo a ${usuario.email}:`, emailError);
          }
        }

        // Actualizar la planilla
        await prisma.planilla.update({
          where: { PlanillaID: planilla.PlanillaID },
          data: {
            PlanillaFechaNotificacion: new Date(),
            PlanillaEnvioNotificacion: true,
          },
        });

        enviados++;
        console.log(`[SCHEDULER] ✓ Planilla #${planilla.PlanillaID} marcada como notificada`);
      } catch (error: any) {
        errores++;
        console.error(`[SCHEDULER] ✗ Error procesando planilla #${planilla.PlanillaID}:`, error.message);
      }
    }

    console.log(`[SCHEDULER] Finalizado - Notificados: ${enviados}, Errores: ${errores}`);
  } catch (error: any) {
    console.error('[SCHEDULER] Error general en notificación:', error.message);
  }
}

export { notificarPlanillasVencidas };
