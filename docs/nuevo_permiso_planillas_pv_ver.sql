-- Agregar permiso para que Punto de Venta pueda ver sus planillas
INSERT INTO Permiso (PermisoNombre, PermisoDescripcion, PermisoRecurso) 
VALUES ('planillas_pv_ver', 'Ver Planillas - Punto de Venta', 'planillas');

-- Asignar el permiso al rol Punto de Venta (asumiendo que el rol ID es 3)
-- Verifica el ID del rol antes de ejecutar
INSERT INTO RolPermiso (RolID, PermisoID)
SELECT 3, PermisoID FROM Permiso WHERE PermisoNombre = 'planillas_pv_ver';
