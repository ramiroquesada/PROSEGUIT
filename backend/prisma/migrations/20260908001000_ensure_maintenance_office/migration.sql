-- Las bases importadas con la lógica anterior pueden no tener una oficina
-- formal llamada Mantenimiento, porque SEGUIT 1 sólo la guardaba en
-- equipo.ubicacion_tmp. La ubicamos en la misma sección que la primera
-- oficina de Soporte; si no existe, usamos la primera sección disponible.
INSERT INTO "oficina" ("nombre", "seccion_id", "tipo")
SELECT
  'Mantenimiento',
  COALESCE(
    (SELECT "seccion_id" FROM "oficina" WHERE "tipo" = 'SOPORTE'::"tipo_oficina" ORDER BY "id" LIMIT 1),
    (SELECT "id" FROM "seccion" ORDER BY "id" LIMIT 1)
  ),
  'MANTENIMIENTO'::"tipo_oficina"
WHERE NOT EXISTS (
  SELECT 1 FROM "oficina" WHERE lower(trim("nombre")) = 'mantenimiento'
)
AND EXISTS (SELECT 1 FROM "seccion");
