-- AlterEnum
ALTER TYPE "estado_equipo" ADD VALUE 'NUEVO';

-- AlterTable
ALTER TABLE "equipo" ALTER COLUMN "estado" SET DEFAULT 'NUEVO';
