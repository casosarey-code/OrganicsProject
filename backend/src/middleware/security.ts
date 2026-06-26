import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiter general - 100 requests por minuto por IP
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 solicitudes por ventana
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter estricto para login - 5 intentos por minuto
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 intentos de login por minuto
  message: { error: 'Demasiados intentos de inicio de sesión, intenta de nuevo en 1 minuto' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
});

// Rate limiter para registro - 3 intentos por hora
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por hora
  message: { error: 'Demasiados intentos de registro, intenta de nuevo en 1 hora' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configuración de Helmet para headers de seguridad
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});
