import { Router, Request, Response } from 'express';
import { authJwt } from '../middleware/authJwt';
import { validatePermission } from '../middleware/validatePermission';

const router = Router();

// GET - Listar historial de correos
router.get('/', authJwt, validatePermission('historial_correos_read'), async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { page = 1, limit = 20, estado } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT h.*, p."PlantillaNombre" 
      FROM "HistorialCorreos" h
      LEFT JOIN "PlantillasCorreo" p ON h."PlantillaID" = p."PlantillaID"
    `;
    let countQuery = 'SELECT COUNT(*) FROM "HistorialCorreos"';
    
    const params: any[] = [];
    
    if (estado) {
      query += ' WHERE h."CorreoEstado" = $1';
      countQuery += ' WHERE "CorreoEstado" = $1';
      params.push(estado);
    }
    
    query += ` ORDER BY h."CorreoFechaEnvio" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const result = await db.query(query, [...params, Number(limit), offset]);
    const countResult = await db.query(countQuery, params);
    
    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

export default router;
