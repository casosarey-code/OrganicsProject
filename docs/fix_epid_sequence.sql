-- Script para reiniciar el sequence de EPID en la tabla EmpresaPlanilla
-- Esto resuelve problemas donde el ID de EmpresaPlanilla se desincroniza

-- Paso 1: Ver el estado actual del sequence y la tabla
SELECT 'Estado actual de EPID:' AS info;
SELECT MAX(EPID) AS max_epid FROM "EmpresaPlanilla";
SELECT last_value AS last_epid FROM "EmpresaPlanilla_EPID_seq";

-- Paso 2: Reiniciar el sequence para que el próximo EPID sea max(EPID) + 1
SELECT setval(
    pg_get_serial_sequence('"EmpresaPlanilla"', 'EPID'),
    COALESCE((SELECT MAX(EPID) FROM "EmpresaPlanilla"), 0) + 1,
    false
) AS new_sequence_value;

-- Paso 3: Verificar el nuevo estado
SELECT 'Nuevo estado del sequence:' AS info;
SELECT last_value AS last_epid FROM "EmpresaPlanilla_EPID_seq";

-- Nota: Esta consulta solo funciona en PostgreSQL
-- Si hay un error, verificar que la tabla y el sequence existan
