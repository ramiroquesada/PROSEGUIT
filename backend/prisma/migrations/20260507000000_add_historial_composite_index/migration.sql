-- Mejora la consulta de timeline de equipo (usada en EquipmentDetailPage)
CREATE INDEX IF NOT EXISTS "historial_equipo_id_fecha_idx"
  ON "historial" ("equipo_id", "fecha" DESC);
