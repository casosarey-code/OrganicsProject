import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';

const router = Router();

// GET público - Sin autenticación (para Login)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    
    const result = await db.query('SELECT "PGID", "PGNombrePlataforma", "PGImagenLogin", "PGImagenPlataforma" FROM "ParametrosGenerales" WHERE "PGID" = 1');
    
    if (result.rows.length === 0) {
      res.json({ PGNombrePlataforma: 'Organics' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener parámetros' });
  }
});

// GET - Obtener parámetros generales (requiere auth)
router.get('/', authJwt, async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    
    const result = await db.query('SELECT * FROM "ParametrosGenerales" WHERE "PGID" = 1');
    
    if (result.rows.length === 0) {
      // Crear registro por defecto si no existe
      await db.query(`
        INSERT INTO "ParametrosGenerales" ("PGNombrePlataforma", "PGRecuperacionPass", "PGImagenesCarrusel")
        VALUES ('Organics', true, '[]'::jsonb)
      `);
      const newResult = await db.query('SELECT * FROM "ParametrosGenerales" WHERE "PGID" = 1');
      res.json(newResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener parámetros' });
  }
});

// PUT - Actualizar parámetros generales
router.put('/', authJwt, validatePermission('config_general_update'), async (req: Request, res: Response) => {
  try {
    const { PGID, PGImagenLogin, PGNombrePlataforma, PGImagenPlataforma, PGRecuperacionPass, PGImagenesCarrusel } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.query(`
      UPDATE "ParametrosGenerales" 
      SET "PGImagenLogin" = $1,
          "PGNombrePlataforma" = $2,
          "PGImagenPlataforma" = $3,
          "PGRecuperacionPass" = $4,
          "PGImagenesCarrusel" = $5
      WHERE "PGID" = $6
      RETURNING *
    `, [PGImagenLogin, PGNombrePlataforma, PGImagenPlataforma, PGRecuperacionPass, JSON.stringify(PGImagenesCarrusel || []), PGID]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetros no encontrados' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar parámetros' });
  }
});

export default router;
