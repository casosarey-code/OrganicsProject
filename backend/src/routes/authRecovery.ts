import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { enviarEmail, reemplazarVariables } from '../services/emailService';

const router = Router();

// Tabla: TokenRecuperacion
// CREATE TABLE IF NOT EXISTS TokenRecuperacion (
//     TokenID SERIAL PRIMARY KEY,
//     TokenUsuarioID UUID REFERENCES users(id),
//     TokenHash VARCHAR(200) NOT NULL UNIQUE,
//     TokenExpira TIMESTAMP NOT NULL,
//     TokenUsado BOOLEAN DEFAULT FALSE,
//     TokenFechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// POST /api/auth/forgot-password - Solicitar recuperación
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const db = req.app.locals.db;

    if (!email) {
      res.status(400).json({ error: 'Email es requerido' });
      return;
    }

    // Buscar usuario por email
    const userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // Siempre devolver éxito por seguridad (no revelar si el email existe)
    if (userResult.rows.length === 0) {
      res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' });
      return;
    }

    const user = userResult.rows[0];

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Guardar token en base de datos
    await db.query(`
      INSERT INTO "TokenRecuperacion" ("TokenUsuarioID", "TokenHash", "TokenExpira")
      VALUES ($1, $2, $3)
    `, [user.id, tokenHash, expira]);

    // Obtener plataforma desde parámetros generales
    let nombrePlataforma = 'Organics';
    try {
      const pgResult = await db.query('SELECT "PGNombrePlataforma" FROM "ParametrosGenerales" LIMIT 1');
      if (pgResult.rows.length > 0) {
        nombrePlataforma = pgResult.rows[0].PGNombrePlataforma;
      }
    } catch (e) {
      console.log('No se pudo obtener nombre de plataforma');
    }

    // Construir enlace de recuperación
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password/${token}`;

    // Obtener plantilla de email
    let asunto = 'Recuperación de contraseña';
    let cuerpoHtml = `
      <h1>Hola ${user.fullName || user.email}</h1>
      <p>Has solicitado recuperar tu contraseña. Haz clic en el siguiente enlace para restablecerla:</p>
      <p><a href="${resetLink}">Restablecer contraseña</a></p>
      <p>Este enlace expirará en 24 horas.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `;

    try {
      // Intentar usar plantilla de base de datos
      const plantillaResult = await db.query(
        'SELECT * FROM "PlantillasCorreo" WHERE "PlantillaNombre" = $1 AND "PlantillaActivo" = true',
        ['RecuperacionPassword']
      );

      if (plantillaResult.rows.length > 0) {
        const plantilla = plantillaResult.rows[0];
        asunto = plantilla.PlantillaAsunto;
        cuerpoHtml = reemplazarVariables(plantilla.PlantillaCuerpo, {
          nombre: user.fullName || user.email,
          link: resetLink
        });
      }
    } catch (e) {
      console.log('No se pudo obtener plantilla de email');
    }

    // Enviar email
    try {
      await enviarEmail(req, {
        to: user.email,
        subject: asunto,
        html: cuerpoHtml
      });
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // No fallar si el email no se envía
    }

    res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

// POST /api/auth/reset-password - Restablecer contraseña
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const db = req.app.locals.db;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Hash del token para buscarlo
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token válido
    const tokenResult = await db.query(`
      SELECT tr.*, u.id as user_id 
      FROM "TokenRecuperacion" tr
      JOIN users u ON tr."TokenUsuarioID" = u.id
      WHERE tr."TokenHash" = $1 
        AND tr."TokenUsado" = false 
        AND tr."TokenExpira" > NOW()
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      res.status(400).json({ error: 'Token inválido o expirado' });
      return;
    }

    const tokenRecord = tokenResult.rows[0];

    // Actualizar contraseña del usuario (bcrypt)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, tokenRecord.user_id]
    );

    // Marcar token como usado
    await db.query(
      'UPDATE "TokenRecuperacion" SET "TokenUsado" = true WHERE "TokenID" = $1',
      [tokenRecord.TokenID]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// GET /api/auth/validate-token - Validar token (para frontend)
router.get('/validate-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const db = req.app.locals.db;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(`
      SELECT tr.*, u.email 
      FROM "TokenRecuperacion" tr
      JOIN users u ON tr."TokenUsuarioID" = u.id
      WHERE tr."TokenHash" = $1 
        AND tr."TokenUsado" = false 
        AND tr."TokenExpira" > NOW()
    `, [tokenHash]);

    if (result.rows.length === 0) {
      res.status(400).json({ valid: false, error: 'Token inválido o expirado' });
      return;
    }

    res.json({ valid: true, email: result.rows[0].email });
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({ valid: false, error: 'Error al validar token' });
  }
});

export default router;
