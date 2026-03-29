-- Índices de rendimiento para consultas frecuentes
CREATE INDEX IF NOT EXISTS "historial_usuario_id_idx" ON "historial"("usuario_id");
CREATE INDEX IF NOT EXISTS "historial_accion_idx" ON "historial"("accion");
CREATE INDEX IF NOT EXISTS "prestamo_equipo_id_idx" ON "prestamo"("equipo_id");
CREATE INDEX IF NOT EXISTS "prestamo_activo_idx" ON "prestamo"("activo");
