CREATE TABLE "ejecucion_migracion" (
    "id" UUID NOT NULL,
    "origen" VARCHAR(50) NOT NULL,
    "archivo_fuente" VARCHAR(255),
    "huella_fuente" VARCHAR(64) NOT NULL,
    "exportado_at" TIMESTAMP(3),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO',
    "resumen" JSONB NOT NULL DEFAULT '{}',
    "iniciada_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_at" TIMESTAMP(3),

    CONSTRAINT "ejecucion_migracion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anomalia_migracion" (
    "id" SERIAL NOT NULL,
    "ejecucion_id" UUID NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "severidad" VARCHAR(20) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "muestra" JSONB NOT NULL DEFAULT '[]',
    "estado" VARCHAR(20) NOT NULL DEFAULT 'A_REVISAR',
    "resolucion" TEXT,
    "creada_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_at" TIMESTAMP(3),

    CONSTRAINT "anomalia_migracion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ejecucion_migracion_huella_fuente_idx" ON "ejecucion_migracion"("huella_fuente");
CREATE INDEX "ejecucion_migracion_estado_idx" ON "ejecucion_migracion"("estado");
CREATE INDEX "anomalia_migracion_estado_idx" ON "anomalia_migracion"("estado");
CREATE INDEX "anomalia_migracion_codigo_idx" ON "anomalia_migracion"("codigo");
CREATE UNIQUE INDEX "anomalia_migracion_ejecucion_id_codigo_key" ON "anomalia_migracion"("ejecucion_id", "codigo");

ALTER TABLE "anomalia_migracion"
ADD CONSTRAINT "anomalia_migracion_ejecucion_id_fkey"
FOREIGN KEY ("ejecucion_id") REFERENCES "ejecucion_migracion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
