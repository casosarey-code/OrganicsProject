🗄️ Estructura de Base de Datos (Simplificada)
Tabla: ConfiguracionSMTP (Única configuración)
sql
-- =============================================
-- TABLA: ConfiguracionSMTP (Una sola empresa)
-- =============================================
CREATE TABLE IF NOT EXISTS ConfiguracionSMTP (
    SMTPID              SERIAL PRIMARY KEY,
    SMTPHost            VARCHAR(200) NOT NULL,
    SMTPPort            INT NOT NULL DEFAULT 587,
    SMTPUsuario         VARCHAR(200) NOT NULL,
    SMTPPassword        VARCHAR(500) NOT NULL,  -- Encriptada
    SMTPFromEmail       VARCHAR(200) NOT NULL,
    SMTPFromName        VARCHAR(200) DEFAULT 'Sistema Notificaciones',
    SMTPSecure          VARCHAR(10) DEFAULT 'TLS',  -- TLS, SSL, NONE
    SMTPAuth            BOOLEAN DEFAULT TRUE,
    SMTPTimeout         INT DEFAULT 10000,
    SMTPActivo          BOOLEAN DEFAULT TRUE,
    SMTPCreaFecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    SMTPActualizaFecha  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO ConfiguracionSMTP (
    SMTPHost, SMTPPort, SMTPUsuario, SMTPPassword, 
    SMTPFromEmail, SMTPFromName, SMTPSecure
) VALUES (
    'smtp.gmail.com', 587, 'tu_correo@gmail.com', 
    'contraseña_encriptada', 'tu_correo@gmail.com', 
    'Sistema Notificaciones', 'TLS'
) ON CONFLICT DO NOTHING;
Tabla: PlantillasCorreo (Plantillas reutilizables)
sql
-- =============================================
-- TABLA: PlantillasCorreo
-- =============================================
CREATE TABLE IF NOT EXISTS PlantillasCorreo (
    PlantillaID         SERIAL PRIMARY KEY,
    PlantillaNombre     VARCHAR(100) NOT NULL UNIQUE,
    PlantillaAsunto     VARCHAR(500) NOT NULL,
    PlantillaCuerpo     TEXT NOT NULL,
    PlantillaVariables  JSONB DEFAULT '[]',
    PlantillaTipo       VARCHAR(50) DEFAULT 'HTML',
    PlantillaActivo     BOOLEAN DEFAULT TRUE,
    PlantillaCreaFecha  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PlantillaActualizaFecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar plantillas por defecto
INSERT INTO PlantillasCorreo (PlantillaNombre, PlantillaAsunto, PlantillaCuerpo, PlantillaVariables) VALUES
('Bienvenida', '¡Bienvenido a {{empresa}}!', 
 '<h1>Hola {{nombre}}</h1><p>Bienvenido a {{empresa}}. Tu cuenta ha sido creada exitosamente.</p><p>Para comenzar, ingresa a: <a href="{{link}}">{{link}}</a></p>',
 '["nombre", "empresa", "link"]'),

('RecuperacionPassword', 'Recuperación de contraseña', 
 '<h1>Hola {{nombre}}</h1><p>Has solicitado recuperar tu contraseña. Haz clic en el siguiente enlace para restablecerla:</p><p><a href="{{link}}">{{link}}</a></p><p>Este enlace expirará en 24 horas.</p>',
 '["nombre", "link"]'),

('NotificacionVenta', 'Nueva venta registrada - #{{ventaID}}', 
 '<h1>Nueva venta</h1><p>Se ha registrado una nueva venta:</p><ul><li><strong>ID:</strong> {{ventaID}}</li><li><strong>Total:</strong> {{total}}</li><li><strong>Fecha:</strong> {{fecha}}</li></ul><p>Ver detalles: <a href="{{link}}">{{link}}</a></p>',
 '["ventaID", "total", "fecha", "link"]');
Tabla: HistorialCorreos (Log de envíos)
sql
-- =============================================
-- TABLA: HistorialCorreos
-- =============================================
CREATE TABLE IF NOT EXISTS HistorialCorreos (
    CorreoID            SERIAL PRIMARY KEY,
    CorreoDestinatario  VARCHAR(200) NOT NULL,
    CorreoCC            VARCHAR(500),
    CorreoCCO           VARCHAR(500),
    CorreoAsunto        VARCHAR(500) NOT NULL,
    CorreoCuerpo        TEXT NOT NULL,
    CorreoAdjuntos      JSONB,
    CorreoEstado        VARCHAR(20) DEFAULT 'ENVIADO',  -- ENVIADO, ERROR, PENDIENTE
    CorreoError         TEXT,
    CorreoFechaEnvio    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CorreoFechaLeido    TIMESTAMP,
    CorreoEnviadoPor    UUID,  -- FK a users
    CorreoMetadata      JSONB,
    PlantillaID         INT REFERENCES PlantillasCorreo(PlantillaID) ON DELETE SET NULL,
    SMTPID              INT REFERENCES ConfiguracionSMTP(SMTPID)
);

-- Índices
CREATE INDEX idx_historial_fecha ON HistorialCorreos(CorreoFechaEnvio DESC);
CREATE INDEX idx_historial_destinatario ON HistorialCorreos(CorreoDestinatario);
CREATE INDEX idx_historial_estado ON HistorialCorreos(CorreoEstado);