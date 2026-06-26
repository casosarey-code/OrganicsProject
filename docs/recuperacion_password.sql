-- =============================================
-- TABLA: TokenRecuperacion
-- =============================================
CREATE TABLE IF NOT EXISTS "TokenRecuperacion" (
    "TokenID" SERIAL PRIMARY KEY,
    "TokenUsuarioID" UUID REFERENCES users(id),
    "TokenHash" VARCHAR(200) NOT NULL UNIQUE,
    "TokenExpira" TIMESTAMP NOT NULL,
    "TokenUsado" BOOLEAN DEFAULT FALSE,
    "TokenFechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_token_hash ON "TokenRecuperacion"("TokenHash");
CREATE INDEX IF NOT EXISTS idx_token_usuario ON "TokenRecuperacion"("TokenUsuarioID");
