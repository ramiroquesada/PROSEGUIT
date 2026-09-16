-- FOTO_AGREGADA y FOTO_ELIMINADA ya estaban en schema.prisma y en el modulo de
-- imagenes de equipos, pero ninguna migracion las agregaba al enum. Las bases
-- que se habian sincronizado con db push ya las tienen, por eso la forma
-- idempotente, que ademas deja levantar una base desde cero.
--
-- No se usan estos valores en esta misma migracion: PostgreSQL no permite
-- referenciar un valor de enum en la transaccion que lo agrega.
ALTER TYPE "accion_tipo" ADD VALUE IF NOT EXISTS 'FOTO_AGREGADA';
ALTER TYPE "accion_tipo" ADD VALUE IF NOT EXISTS 'FOTO_ELIMINADA';
