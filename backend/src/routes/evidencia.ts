import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authJwt, AuthRequest } from '../middleware/authJwt';

const router = Router();

// Configuración de multer para guardar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Siempre usar ruta absoluta para producción
    cb(null, '/opt/backend/public/evidencias');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `evidencia-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos: jpeg, jpg, png, pdf, doc, docx, xls, xlsx'));
  }
});

// Asegurar que existe la carpeta de evidencias
import fs from 'fs';
const evidenciaDir = path.join(__dirname, '../../public/evidencias');
if (!fs.existsSync(evidenciaDir)) {
  fs.mkdirSync(evidenciaDir, { recursive: true });
}

// Subir evidencia
router.post('/upload', authJwt, upload.single('file'), (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No se envió ningún archivo' });
      return;
    }

    // Retornar la URL del archivo
    const fileUrl = `/evidencias/${req.file.filename}`;
    res.json({ 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error al subir evidencia:', error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

export default router;
