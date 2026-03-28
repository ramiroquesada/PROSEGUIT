-- Remove DADO_DE_BAJA from estado_equipo enum
-- No rows use this value (confirmed: SELECT COUNT(*) FROM equipo WHERE estado = 'DADO_DE_BAJA' = 0)
ALTER TYPE "estado_equipo" RENAME TO "estado_equipo_old";
CREATE TYPE "estado_equipo" AS ENUM ('NUEVO', 'ACTIVO', 'EN_REPARACION', 'EN_DEPOSITO', 'PRESTADO', 'EN_SERVICIO_EXTERNO');
ALTER TABLE "equipo" ALTER COLUMN "estado" TYPE "estado_equipo" USING "estado"::text::"estado_equipo";
DROP TYPE "estado_equipo_old";

-- Remove BAJA from accion_tipo enum
-- No rows use this value (confirmed: SELECT COUNT(*) FROM historial WHERE accion = 'BAJA' = 0)
ALTER TYPE "accion_tipo" RENAME TO "accion_tipo_old";
CREATE TYPE "accion_tipo" AS ENUM ('CREACION', 'ASIGNACION', 'TRANSFERENCIA', 'ENVIO_SOPORTE', 'RETORNO_SOPORTE', 'PRESTAMO', 'DEVOLUCION', 'CAMBIO_ESTADO', 'EDICION', 'ENVIO_SERVICIO_EXTERNO', 'RETORNO_SERVICIO_EXTERNO');
ALTER TABLE "historial" ALTER COLUMN "accion" TYPE "accion_tipo" USING "accion"::text::"accion_tipo";
DROP TYPE "accion_tipo_old";
