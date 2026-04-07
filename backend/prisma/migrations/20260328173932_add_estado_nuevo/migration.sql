-- AlterEnum - Agrega NUEVO a estado_equipo
-- Nota: No usamos el nuevo valor en la misma transacción (limitación de PostgreSQL)
ALTER TYPE "estado_equipo" ADD VALUE 'NUEVO';
