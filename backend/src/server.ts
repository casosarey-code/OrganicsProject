import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { config } from './config';
import prisma from './config/db';
import { helmetMiddleware, generalRateLimiter } from './middleware/security';

import authRoutes from './routes/auth';
import authRecoveryRoutes from './routes/authRecovery';
import planillasRoutes from './routes/planillas';
import empresasRoutes from './routes/empresas';
import empresaPlanillaRoutes from './routes/empresaPlanilla';
import productosRoutes from './routes/productos';
import usuariosRoutes from './routes/usuarios';
import rolesRoutes from './routes/roles';
import permissionsRoutes from './routes/permissions';
import evidenciaRoutes from './routes/evidencia';
import parametrosGeneralesRoutes from './routes/parametrosGenerales';
import configuracionSMTPRoutes from './routes/configuracionSMTP';
import plantillasCorreoRoutes from './routes/plantillasCorreo';
import plantillasEmailRoutes from './routes/plantillasEmail';
import historialCorreosRoutes from './routes/historialCorreos';
import analiticaRoutes from './routes/analitica';
import tareaProgramadaRoutes from './routes/tareaProgramada';
import importarProductosRoutes from './routes/importarProductos';
import importarEmpresaProductosRoutes from './routes/importarEmpresaProductos';
import { initScheduler } from './services/scheduler';
import { seedPermissions } from './config/seedPermisos';

dotenv.config();

const app = express();

// Conexión PostgreSQL usando DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.locals.db = pool;

app.use(helmetMiddleware);
app.use(cors());
app.use(generalRateLimiter);
app.use(express.json({ limit: '10kb' })); // Limitar tamaño del body

// Servir archivos estáticos de evidencias
app.use('/evidencias', express.static(path.join(__dirname, '../public/evidencias')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', authRecoveryRoutes);
app.use('/api/planillas', planillasRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/empresa-planilla', empresaPlanillaRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/evidencia', evidenciaRoutes);
app.use('/api/parametros-generales', parametrosGeneralesRoutes);
app.use('/api/configuracion-smtp', configuracionSMTPRoutes);
app.use('/api/plantillas-correo', plantillasCorreoRoutes);
app.use('/api/plantillas-email', plantillasEmailRoutes);
app.use('/api/historial-correos', historialCorreosRoutes);
app.use('/api/analitica', analiticaRoutes);
app.use('/api/tareas', tareaProgramadaRoutes);
app.use('/api/productos/importar', importarProductosRoutes);
app.use('/api/empresa-productos/importar', importarEmpresaProductosRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

const PORT = config.port;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);

  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    await seedPermissions();
    
    // Iniciar scheduler de tareas programadas
    if (process.env.ENABLE_SCHEDULER === 'true') {
      initScheduler();
    }
  } catch (error) {
    console.error('Database connection failed:', error);
  }
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
