-- Insumos (fase 3 del control de stock). Aditiva: tablas y enum nuevos, no toca datos existentes.

-- CreateEnum
CREATE TYPE "tipo_movimiento_insumo" AS ENUM ('INGRESO', 'ENTREGA', 'AJUSTE');

-- CreateTable
CREATE TABLE "categoria_insumo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "unidad" VARCHAR(30) NOT NULL DEFAULT 'unidad',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_insumo" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "tipo" "tipo_movimiento_insumo" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "oficina_id" INTEGER,
    "equipo_id" INTEGER,
    "recibe" VARCHAR(120),
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_insumo_nombre_key" ON "categoria_insumo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_nombre_key" ON "insumo"("nombre");

-- CreateIndex
CREATE INDEX "insumo_categoria_id_idx" ON "insumo"("categoria_id");

-- CreateIndex
CREATE INDEX "movimiento_insumo_insumo_id_fecha_idx" ON "movimiento_insumo"("insumo_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "movimiento_insumo_fecha_idx" ON "movimiento_insumo"("fecha");

-- CreateIndex
CREATE INDEX "movimiento_insumo_oficina_id_idx" ON "movimiento_insumo"("oficina_id");

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_insumo" ADD CONSTRAINT "movimiento_insumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_insumo" ADD CONSTRAINT "movimiento_insumo_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_insumo" ADD CONSTRAINT "movimiento_insumo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_insumo" ADD CONSTRAINT "movimiento_insumo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Categorías iniciales (se pueden agregar más desde la aplicación).
INSERT INTO "categoria_insumo" ("nombre") VALUES
  ('Telefonía'),
  ('Almacenamiento'),
  ('Pilas y baterías'),
  ('Periféricos'),
  ('Cables y adaptadores'),
  ('Otros')
ON CONFLICT ("nombre") DO NOTHING;
