import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';

const router = Router();

router.use(authJwt);

// GET - Listar plantillas de email
router.get('/', validatePermission('plantillas_email_read'), async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM "PlantillasCorreo" ORDER BY "PlantillaID" ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

// GET - Obtener una plantilla por ID
router.get('/:id', validatePermission('plantillas_email_read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM "PlantillasCorreo" WHERE "PlantillaID" = $1', [id]);
    
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

// POST - Crear nueva plantilla
router.post('/', validatePermission('plantillas_email_create'), async (req: Request, res: Response) => {
  try {
    const { PlantillaNombre, PlantillaAsunto, PlantillaContenido, PlantillaActivo } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.query(`
      INSERT INTO "PlantillasCorreo" ("PlantillaNombre", "PlantillaAsunto", "PlantillaContenido", "PlantillaActivo")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [PlantillaNombre, PlantillaAsunto, PlantillaContenido, PlantillaActivo ?? true]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
});

// PUT - Actualizar plantilla
router.put('/:id', validatePermission('plantillas_email_update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { PlantillaNombre, PlantillaAsunto, PlantillaContenido, PlantillaActivo } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.query(`
      UPDATE "PlantillasCorreo" 
      SET "PlantillaNombre" = $1,
          "PlantillaAsunto" = $2,
          "PlantillaContenido" = $3,
          "PlantillaActivo" = $4
      WHERE "PlantillaID" = $5
      RETURNING *
    `, [PlantillaNombre, PlantillaAsunto, PlantillaContenido, PlantillaActivo, id]);
    
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

// DELETE - Eliminar plantilla
router.delete('/:id', validatePermission('plantillas_email_delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const result = await db.query('DELETE FROM "PlantillasCorreo" WHERE "PlantillaID" = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    
    res.json({ message: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
});

export default router;
