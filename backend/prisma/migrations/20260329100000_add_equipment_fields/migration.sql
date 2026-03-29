-- AddColumn: mac, matricula, asignadoA, proveedor, fechaAdquisicion, nroInventario, garantiaHasta

ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "mac"              VARCHAR(17);
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "matricula"        VARCHAR(100);
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "asignado_a"       TEXT;
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "proveedor"        VARCHAR(200);
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "fecha_adquisicion" TIMESTAMP(3);
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "nro_inventario"   VARCHAR(100);
ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "garantia_hasta"   TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "equipo_matricula_key" ON "equipo"("matricula");
