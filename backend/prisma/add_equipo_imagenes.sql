-- Crear tabla de imágenes múltiples
CREATE TABLE IF NOT EXISTS "equipo_imagen" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipo_imagen_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "equipo_imagen_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "equipo_imagen_equipo_id_idx" ON "equipo_imagen"("equipo_id");

-- Migrar imágenes existentes de url_image a la nueva tabla
INSERT INTO "equipo_imagen" ("equipo_id", "url")
SELECT "id", "url_image" FROM "equipo" WHERE "url_image" IS NOT NULL;

-- Eliminar columna vieja
ALTER TABLE "equipo" DROP COLUMN IF EXISTS "url_image";
