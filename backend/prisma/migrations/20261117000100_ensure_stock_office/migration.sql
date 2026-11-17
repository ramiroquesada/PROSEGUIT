-- Oficina única de stock. Físicamente está en la sala de Soporte, pero es una
-- oficina propia: los equipos asignados a "Informática - Soporte" son de uso
-- del propio personal y no deben figurar como disponibles.
-- Se crea en la misma sección que la primera oficina de Soporte (o la de
-- Mantenimiento, o la primera sección existente).
INSERT INTO "oficina" ("nombre", "seccion_id", "tipo")
SELECT
  'Stock disponible',
  COALESCE(
    (SELECT "seccion_id" FROM "oficina" WHERE "tipo" = 'SOPORTE'::"tipo_oficina" ORDER BY "id" LIMIT 1),
    (SELECT "seccion_id" FROM "oficina" WHERE "tipo" = 'MANTENIMIENTO'::"tipo_oficina" ORDER BY "id" LIMIT 1),
    (SELECT "id" FROM "seccion" ORDER BY "id" LIMIT 1)
  ),
  'STOCK'::"tipo_oficina"
WHERE NOT EXISTS (
  SELECT 1 FROM "oficina" WHERE "tipo" = 'STOCK'::"tipo_oficina"
)
AND EXISTS (SELECT 1 FROM "seccion")
-- Evita chocar con @@unique([nombre, seccion_id]) si ya existía una oficina
-- con ese nombre creada a mano.
AND NOT EXISTS (
  SELECT 1 FROM "oficina" WHERE lower(trim("nombre")) = 'stock disponible'
);

-- Si alguien ya la había creado a mano con ese nombre, se marca como STOCK.
UPDATE "oficina"
SET "tipo" = 'STOCK'::"tipo_oficina"
WHERE lower(trim("nombre")) = 'stock disponible'
AND NOT EXISTS (SELECT 1 FROM "oficina" WHERE "tipo" = 'STOCK'::"tipo_oficina");
