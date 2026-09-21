-- Registro de accesos: logins, fallos, bloqueos y cambios de contraseña.
-- Tabla aparte del historial de equipos.
CREATE TYPE "evento_acceso" AS ENUM ('LOGIN_OK', 'LOGIN_FALLIDO', 'USUARIO_INEXISTENTE', 'USUARIO_INACTIVO', 'USUARIO_BLOQUEADO', 'LOGOUT', 'CAMBIO_PASSWORD', 'RESET_PASSWORD', 'SESIONES_CERRADAS');

ALTER TABLE "usuario" ADD COLUMN "ultimo_acceso" TIMESTAMP(3);

CREATE TABLE "registro_acceso" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evento" "evento_acceso" NOT NULL,
    "ficha" INTEGER,
    "usuario_id" INTEGER,
    "actor_id" INTEGER,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(500),

    CONSTRAINT "registro_acceso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registro_acceso_fecha_idx" ON "registro_acceso"("fecha" DESC);
CREATE INDEX "registro_acceso_ficha_fecha_idx" ON "registro_acceso"("ficha", "fecha" DESC);

ALTER TABLE "registro_acceso" ADD CONSTRAINT "registro_acceso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registro_acceso" ADD CONSTRAINT "registro_acceso_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
