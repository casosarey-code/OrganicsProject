import cron from 'node-cron';
import prisma from '../config/db';

async function crearPlanillasMasivas() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    console.log('=== [SCHEDULER] Iniciando creación masiva de planillas ===');
    console.log('Fecha de ejecución:', new Date().toISOString());

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
        // Verificar si ya existe planilla para hoy
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
          existentes++;
          continue;
        }

        // Calcular fecha de vencimiento (36 horas)
        const fechaVencimiento = new Date();
        fechaVencimiento.setHours(fechaVencimiento.getHours() + 36);

        // Crear planilla
        await prisma.planilla.create({
          data: {
            PlanillaFecha: new Date(),
            PlanillaPuntoVenta: empresa.EmpresaID,
            PlanillaCreaUsuario: userId,
            PlanillaCreaFecha: new Date(),
            PlanillaEstado: 'A',
            PlanillaEnvioNotificacion: false,
            PlanillaFechaVencimiento: fechaVencimiento,
            detalles: empresa.empresaProductos.length > 0 ? {
              create: empresa.empresaProductos.map((ep) => ({
                PDProducto: ep.EPProducto,
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
export { crearPlanillasMasivas };

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
