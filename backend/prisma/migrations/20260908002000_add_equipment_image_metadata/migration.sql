-- Estos campos ya formaban parte del modelo y de la interfaz de fotos, pero
-- faltaban en la cadena histórica de migraciones. IF NOT EXISTS mantiene la
-- compatibilidad con bases que habían sido sincronizadas previamente con db push.
ALTER TABLE "equipo_imagen"
ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
