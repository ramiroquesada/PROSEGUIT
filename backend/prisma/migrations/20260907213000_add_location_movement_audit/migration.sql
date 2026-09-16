CREATE TYPE "entidad_movimiento_ubicacion" AS ENUM ('OFICINA', 'SECCION');

CREATE TABLE "movimiento_ubicacion" (
    "id" SERIAL NOT NULL,
    "entidad" "entidad_movimiento_ubicacion" NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "entidad_nombre" VARCHAR(100) NOT NULL,
    "origen_ciudad_id" INTEGER NOT NULL,
    "origen_ciudad_nombre" VARCHAR(100) NOT NULL,
    "origen_seccion_id" INTEGER,
    "origen_seccion_nombre" VARCHAR(100),
    "destino_ciudad_id" INTEGER NOT NULL,
    "destino_ciudad_nombre" VARCHAR(100) NOT NULL,
    "destino_seccion_id" INTEGER,
    "destino_seccion_nombre" VARCHAR(100),
    "cantidad_equipos" INTEGER NOT NULL DEFAULT 0,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_ubicacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movimiento_ubicacion_entidad_entidad_id_idx"
ON "movimiento_ubicacion"("entidad", "entidad_id");

CREATE INDEX "movimiento_ubicacion_usuario_id_idx"
ON "movimiento_ubicacion"("usuario_id");

CREATE INDEX "movimiento_ubicacion_created_at_idx"
ON "movimiento_ubicacion"("created_at" DESC);

ALTER TABLE "movimiento_ubicacion"
ADD CONSTRAINT "movimiento_ubicacion_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
