-- Migración para agregar campos de solo contabilidad y composición de productos
-- Ejecutar en la base de datos de producción

-- 1. Agregar columna ProductoSoloContabilidad a la tabla Productos
ALTER TABLE "Productos" ADD COLUMN IF NOT EXISTS "ProductoSoloContabilidad" BOOLEAN DEFAULT false;

-- 2. Crear tabla de composición de productos
CREATE TABLE IF NOT EXISTS "ProductoComposicion" (
  "PCID" SERIAL PRIMARY KEY,
  "PCProducto" INT NOT NULL REFERENCES "Productos"("ProductoID") ON DELETE CASCADE,
  "PCComponente" INT NOT NULL REFERENCES "Productos"("ProductoID") ON DELETE CASCADE,
  "PCCantidad" DECIMAL(10,4) DEFAULT 1,
  UNIQUE("PCProducto", "PCComponente")
);

-- 3. Crear índice para mejorar rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS "idx_productocomposicion_pcproducto" ON "ProductoComposicion"("PCProducto");
CREATE INDEX IF NOT EXISTS "idx_productocomposicion_pccomponente" ON "ProductoComposicion"("PCComponente");

-- 4. Ejemplo: Marcar producto "Pollo Entero" como solo contabilidad
-- UPDATE "Productos" SET "ProductoSoloContabilidad" = true WHERE "ProductoNombre" LIKE '%Pollo Entero%';

-- 5. Ejemplo: Agregar composición para 1/4 de pollo que suma a Pollo
-- INSERT INTO "ProductoComposicion" ("PCProducto", "PCComponente", "PCCantidad")
-- SELECT pcu."ProductoID", pc."ProductoID", 0.25
-- FROM "Productos" pcu
-- JOIN "Productos" pc ON pc."ProductoNombre" = 'Pollo'
-- WHERE pcu."ProductoNombre" LIKE '%1/4 Pollo%';

COMMENT ON COLUMN "Productos"."ProductoSoloContabilidad" IS 'Si true, el producto no genera filas en planillas de inventario, solo se cuenta para ventas';
COMMENT ON COLUMN "ProductoComposicion"."PCCantidad" IS 'Cantidad del componente que suma al producto padre (ej: 0.25 para 1/4 de pollo)';
