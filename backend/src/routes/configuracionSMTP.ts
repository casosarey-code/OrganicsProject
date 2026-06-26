import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';

const router = Router();

const tableName = 'configuracionsmtp';

// GET - Obtener configuración SMTP
router.get('/', authJwt, async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    
    const result = await db.query(`SELECT * FROM ${tableName} LIMIT 1`);
    
    if (result.rows.length === 0) {
      await db.query(`
        INSERT INTO configuracionsmtp (smtphost, smtpport, smtpusuario, smtppassword, smtpfromemail, smtpfromname, smtpsecure, smtpauth, smtptimeout)
        VALUES ('smtp.gmail.com', 587, 'correo@gmail.com', '', 'correo@gmail.com', 'Sistema', 'TLS', true, 10000)
      `);
      const newResult = await db.query(`SELECT * FROM configuracionsmtp LIMIT 1`);
      res.json(newResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener configuración SMTP' });
  }
});

// PUT - Actualizar configuración SMTP
router.put('/', authJwt, async (req: Request, res: Response) => {
  try {
    const { smtpid, smtphost, smtpport, smtpusuario, smtppassword, smtpfromemail, smtpfromname, smtpsecure, smtpauth, smtptimeout } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.query(`
      UPDATE ${tableName} 
      SET smtphost = $1, smtpport = $2, smtpusuario = $3, smtppassword = $4,
          smtpfromemail = $5, smtpfromname = $6, smtpsecure = $7, smtpauth = $8,
          smtptimeout = $9, smtpactualizafecha = CURRENT_TIMESTAMP
      WHERE smtpid = $10
      RETURNING *
    `, [smtphost, smtpport, smtpusuario, smtppassword, smtpfromemail, smtpfromname, smtpsecure, smtpauth, smtptimeout, smtpid]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Configuración no encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar configuración SMTP' });
  }
});

// POST - Probar conexión SMTP
router.post('/test', authJwt, async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    
    const config = await db.query(`SELECT * FROM ${tableName} LIMIT 1`);
    
    if (config.rows.length === 0) {
      res.status(400).json({ success: false, error: 'No hay configuración SMTP guardada' });
      return;
    }

    const smtp = config.rows[0];
    
    // Crear transporter de nodemailer
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: smtp.smtphost,
      port: smtp.smtpport,
      secure: smtp.smtpsecure === 'SSL',
      auth: smtp.smtpauth ? {
        user: smtp.smtpusuario,
        pass: smtp.smtppassword
      } : undefined,
      connectionTimeout: smtp.smtptimeout || 10000
    });

    // Intentar verificar conexión
    await transporter.verify();
    
    // Enviar email de prueba
    await transporter.sendMail({
      from: `"${smtp.smtpfromname}" <${smtp.smtpfromemail}>`,
      to: smtp.smtpfromemail,
      subject: 'Prueba de conexión SMTP',
      text: 'Esta es una prueba de conexión SMTP. Si recibes este correo, la configuración está correcta.',
      html: '<h2>Prueba de conexión SMTP</h2><p>Si recibes este correo, la configuración está correcta.</p>'
    });

    res.json({ success: true, message: 'Conexión exitosa. Email de prueba enviado.' });
  } catch (error: any) {
    console.error('Error en prueba SMTP:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error al probar conexión SMTP' 
    });
  }
});

export default router;
