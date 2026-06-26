import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';

const router = Router();

const tableName = '"PlantillasCorreo"';

// GET - Listar todas las plantillas
router.get('/', authJwt, async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    
    const result = await db.query(
      `SELECT * FROM ${tableName} ORDER BY "PlantillaNombre"`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

// GET - Obtener una plantilla por ID
router.get('/:id', authJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const result = await db.query(
      `SELECT * FROM ${tableName} WHERE "PlantillaID" = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
});

// PUT - Actualizar plantilla
router.put('/:id', authJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { PlantillaNombre, PlantillaAsunto, PlantillaCuerpo, PlantillaVariables, PlantillaTipo, PlantillaActivo } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.query(`
      UPDATE ${tableName} 
      SET "PlantillaNombre" = $1, "PlantillaAsunto" = $2, "PlantillaCuerpo" = $3,
          "PlantillaVariables" = $4, "PlantillaTipo" = $5, "PlantillaActivo" = $6,
          "PlantillaActualizaFecha" = CURRENT_TIMESTAMP
      WHERE "PlantillaID" = $7
      RETURNING *
    `, [PlantillaNombre, PlantillaAsunto, PlantillaCuerpo, PlantillaVariables ? JSON.stringify(PlantillaVariables) : '[]', PlantillaTipo, PlantillaActivo, id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
});

export default router;
