-- Set DEFAULT to NUEVO (must be in separate transaction from ADD VALUE)
-- PostgreSQL doesn't allow using new enum values in the same transaction they're added
ALTER TABLE "equipo" ALTER COLUMN "estado" SET DEFAULT 'NUEVO';
