-- Condición física del equipo (fase 2 del control de stock). Aditiva: tipo nuevo y columna nula.
DO $$ BEGIN
  CREATE TYPE "condicion_equipo" AS ENUM ('BUENO', 'CON_DETALLES', 'SOLO_REPUESTOS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "condicion" "condicion_equipo";
