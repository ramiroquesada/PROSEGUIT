-- Licencias ya estaba contemplado por el modelo y la UI, pero no figuraba
-- en la cadena de migraciones. La forma idempotente mantiene compatibles las
-- bases de desarrollo que hubieran sido sincronizadas previamente con db push.
CREATE TABLE IF NOT EXISTS "licencia" (
    "id" SERIAL NOT NULL,
    "software" VARCHAR(100) NOT NULL,
    "version" VARCHAR(50),
    "clave" VARCHAR(200),
    "tipo" VARCHAR(50),
    "proveedor" VARCHAR(200),
    "precio_compra" DECIMAL(10,2),
    "fecha_compra" TIMESTAMP(3),
    "fecha_expiracion" TIMESTAMP(3),
    "sin_expiracion" BOOLEAN NOT NULL DEFAULT false,
    "observacion" TEXT,
    "equipo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licencia_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "licencia_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "licencia_equipo_id_idx" ON "licencia"("equipo_id");
CREATE INDEX IF NOT EXISTS "licencia_fecha_expiracion_idx" ON "licencia"("fecha_expiracion");
