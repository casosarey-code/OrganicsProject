-- Cambiar columnas de PlanillaDetalle de Int a Float
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantInicial" TYPE FLOAT USING "PDCantInicial"::float;
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantCompra" TYPE FLOAT USING "PDCantCompra"::float;
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantAjuste" TYPE FLOAT USING "PDCantAjuste"::float;
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantVenta" TYPE FLOAT USING "PDCantVenta"::float;
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantSubtotal" TYPE FLOAT USING "PDCantSubtotal"::float;
ALTER TABLE "PlanillaDetalle" ALTER COLUMN "PDCantFinal" TYPE FLOAT USING "PDCantFinal"::float;
