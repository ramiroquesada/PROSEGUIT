ALTER TYPE "tipo_oficina" ADD VALUE IF NOT EXISTS 'MANTENIMIENTO';

ALTER TABLE "equipo"
ADD COLUMN "oficina_asignada_id" INTEGER;

-- Compatibilidad con las bases existentes: hasta ahora la única oficina
-- representaba a la vez la ubicación actual y la oficina asignada.
UPDATE "equipo"
SET "oficina_asignada_id" = "oficina_id";

ALTER TABLE "equipo"
ALTER COLUMN "oficina_asignada_id" SET NOT NULL;

CREATE INDEX "equipo_oficina_asignada_id_idx"
ON "equipo"("oficina_asignada_id");

ALTER TABLE "equipo"
ADD CONSTRAINT "equipo_oficina_asignada_id_fkey"
FOREIGN KEY ("oficina_asignada_id") REFERENCES "oficina"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- En SEGUIT 1, Mantenimiento era la ubicación temporal de los equipos
-- que habían recibido una ENTRADA. Informática - Soporte sigue siendo
-- una oficina asignable normal, aunque físicamente esté en el mismo lugar.
UPDATE "oficina"
SET "tipo" = 'MANTENIMIENTO'::"tipo_oficina"
WHERE lower(trim("nombre")) = 'mantenimiento';
