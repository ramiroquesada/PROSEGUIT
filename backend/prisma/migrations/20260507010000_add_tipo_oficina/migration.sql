-- Crear enum y columna tipo para eliminar string matching en queries de estado
CREATE TYPE "tipo_oficina" AS ENUM ('OFICINA', 'SOPORTE', 'DEPOSITO');

ALTER TABLE "oficina" ADD COLUMN "tipo" "tipo_oficina" NOT NULL DEFAULT 'OFICINA';

-- Backfill: clasificar oficinas existentes por nombre
UPDATE "oficina" SET "tipo" = 'SOPORTE' WHERE LOWER("nombre") LIKE '%soporte%';
UPDATE "oficina" SET "tipo" = 'DEPOSITO' WHERE LOWER("nombre") LIKE '%deposito%' OR LOWER("nombre") LIKE '%depósito%';
