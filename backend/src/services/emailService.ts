import nodemailer from 'nodemailer';
import { Request } from 'express';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  adjuntos?: any[];
}

interface ConfigSMTP {
  SMTPHost: string;
  SMTPPort: number;
  SMTPUsuario: string;
  SMTPPassword: string;
  SMTPFromEmail: string;
  SMTPFromName: string;
  SMTPSecure: string;
  SMTPAuth: boolean;
  SMTPTimeout: number;
}

export async function enviarEmail(req: Request, opciones: EmailOptions) {
  try {
    const db = req.app.locals.db;
    
    // Obtener configuración SMTP activa
    const configResult = await db.query(
      'SELECT * FROM ConfiguracionSMTP WHERE SMTPActivo = true LIMIT 1'
    );
    
    if (configResult.rows.length === 0) {
      throw new Error('No hay configuración SMTP activa');
    }
    
    const config: ConfigSMTP = configResult.rows[0];
    
    // Crear transporter
    const transporter = nodemailer.createTransport({
      host: config.SMTPHost,
      port: config.SMTPPort,
      secure: config.SMTPSecure === 'SSL',
      auth: config.SMTPAuth ? {
        user: config.SMTPUsuario,
        pass: config.SMTPPassword
      } : undefined
    });
    
    // Enviar email
    const info = await transporter.sendMail({
      from: `"${config.SMTPFromName}" <${config.SMTPFromEmail}>`,
      to: opciones.to,
      cc: opciones.cc,
      subject: opciones.subject,
      html: opciones.html,
      attachments: opciones.adjuntos
    });
    
    // Registrar en historial
    await db.query(`
      INSERT INTO HistorialCorreos (
        CorreoDestinatario, CorreoCC, CorreoAsunto, CorreoCuerpo, 
        CorreoAdjuntos, CorreoEstado, CorreoFechaEnvio, CorreoEnviadoPor, SMTPID
      ) VALUES ($1, $2, $3, $4, $5, 'ENVIADO', CURRENT_TIMESTAMP, $6, $7)
    `, [
      opciones.to, 
      opciones.cc || null, 
      opciones.subject, 
      opciones.html,
      opciones.adjuntos ? JSON.stringify(opciones.adjuntos) : null,
      req.body.userId || null,
      config.SMTPID
    ]);
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar email:', error);
    
    // Registrar error en historial
    try {
      const db = req.app.locals.db;
      await db.query(`
        INSERT INTO HistorialCorreos (
          CorreoDestinatario, CorreoAsunto, CorreoCuerpo, CorreoEstado, CorreoError, CorreoFechaEnvio, SMTPID
        ) VALUES ($1, $2, $3, 'ERROR', $4, CURRENT_TIMESTAMP, $5)
      `, [opciones.to, opciones.subject, opciones.html, error.message, 1]);
    } catch (logError) {
      console.error('Error al registrar en historial:', logError);
    }
    
    throw error;
  }
}

export function reemplazarVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
