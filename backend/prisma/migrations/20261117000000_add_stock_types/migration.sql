-- Control de stock: una oficina tipo STOCK agrupa los equipos sanos listos
-- para usarse. DEPOSITO sigue siendo el descarte y nunca cuenta como stock.
--
-- Sólo se agregan valores a los enums; se usan recién en la migración
-- siguiente porque PostgreSQL no permite usar un valor nuevo de enum en la
-- misma transacción que lo agrega.
ALTER TYPE "tipo_oficina" ADD VALUE IF NOT EXISTS 'STOCK';
ALTER TYPE "estado_equipo" ADD VALUE IF NOT EXISTS 'DISPONIBLE';

CREATE TYPE "etapa_stock" AS ENUM ('A_REVISAR', 'LISTO');

ALTER TABLE "equipo"
ADD COLUMN "stock_etapa" "etapa_stock",
ADD COLUMN "stock_desde" TIMESTAMP(3);
