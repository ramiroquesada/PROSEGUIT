-- CreateEnum
CREATE TYPE "estado_equipo" AS ENUM ('ACTIVO', 'EN_REPARACION', 'DADO_DE_BAJA', 'EN_DEPOSITO', 'PRESTADO', 'EN_SERVICIO_EXTERNO');

-- CreateEnum
CREATE TYPE "accion_tipo" AS ENUM ('CREACION', 'TRANSFERENCIA', 'ENVIO_SOPORTE', 'RETORNO_SOPORTE', 'PRESTAMO', 'DEVOLUCION', 'BAJA', 'CAMBIO_ESTADO', 'EDICION', 'ENVIO_SERVICIO_EXTERNO', 'RETORNO_SERVICIO_EXTERNO');

-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('ADMIN', 'TECNICO');

-- CreateTable
CREATE TABLE "ciudad" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seccion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ciudad_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oficina" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "seccion_id" INTEGER NOT NULL,
    "v1_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_equipo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "icono" VARCHAR(50),
    "v1_id" INTEGER,

    CONSTRAINT "tipo_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_template" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo_equipo_id" INTEGER NOT NULL,
    "marca" VARCHAR(50),
    "especificaciones" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelo_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" SERIAL NOT NULL,
    "serie" INTEGER NOT NULL,
    "modelo" VARCHAR(100),
    "template_id" INTEGER,
    "tipo_equipo_id" INTEGER NOT NULL,
    "oficina_id" INTEGER NOT NULL,
    "estado" "estado_equipo" NOT NULL DEFAULT 'ACTIVO',
    "ip" VARCHAR(45),
    "url_image" VARCHAR(500),
    "observacion" TEXT,
    "especificaciones" JSONB NOT NULL DEFAULT '{}',
    "v1_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "accion" "accion_tipo" NOT NULL,
    "oficina_origen_id" INTEGER,
    "oficina_destino_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamo" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "oficina_destino_id" INTEGER NOT NULL,
    "solicitante_ficha" INTEGER NOT NULL,
    "tecnico_id" INTEGER NOT NULL,
    "fecha_prestamo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_devolucion" TIMESTAMP(3),
    "devuelto_por_ficha" INTEGER,
    "recibido_por_id" INTEGER,
    "motivo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio_externo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "contacto" VARCHAR(200),
    "telefono" VARCHAR(50),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicio_externo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envio_servicio" (
    "id" SERIAL NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "servicio_id" INTEGER NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_retorno" TIMESTAMP(3),
    "motivo" TEXT NOT NULL,
    "diagnostico" TEXT,
    "costo" DECIMAL(10,2),
    "tecnico_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envio_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ficha" INTEGER NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "rol_usuario" NOT NULL DEFAULT 'TECNICO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "oficina_id" INTEGER,
    "v1_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionario" (
    "ficha" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "oficina_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("ficha")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ciudad_nombre_key" ON "ciudad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "seccion_nombre_ciudad_id_key" ON "seccion"("nombre", "ciudad_id");

-- CreateIndex
CREATE UNIQUE INDEX "oficina_nombre_seccion_id_key" ON "oficina"("nombre", "seccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_equipo_nombre_key" ON "tipo_equipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "equipo_serie_key" ON "equipo"("serie");

-- CreateIndex
CREATE INDEX "equipo_tipo_equipo_id_idx" ON "equipo"("tipo_equipo_id");

-- CreateIndex
CREATE INDEX "equipo_oficina_id_idx" ON "equipo"("oficina_id");

-- CreateIndex
CREATE INDEX "equipo_estado_idx" ON "equipo"("estado");

-- CreateIndex
CREATE INDEX "historial_equipo_id_idx" ON "historial"("equipo_id");

-- CreateIndex
CREATE INDEX "historial_fecha_idx" ON "historial"("fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_ficha_key" ON "usuario"("ficha");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_key" ON "refresh_token"("token");

-- AddForeignKey
ALTER TABLE "seccion" ADD CONSTRAINT "seccion_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oficina" ADD CONSTRAINT "oficina_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "seccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_template" ADD CONSTRAINT "modelo_template_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipo_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "modelo_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipo_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_oficina_origen_id_fkey" FOREIGN KEY ("oficina_origen_id") REFERENCES "oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_oficina_destino_id_fkey" FOREIGN KEY ("oficina_destino_id") REFERENCES "oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial" ADD CONSTRAINT "historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_oficina_destino_id_fkey" FOREIGN KEY ("oficina_destino_id") REFERENCES "oficina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_solicitante_ficha_fkey" FOREIGN KEY ("solicitante_ficha") REFERENCES "funcionario"("ficha") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_devuelto_por_ficha_fkey" FOREIGN KEY ("devuelto_por_ficha") REFERENCES "funcionario"("ficha") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo" ADD CONSTRAINT "prestamo_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envio_servicio" ADD CONSTRAINT "envio_servicio_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envio_servicio" ADD CONSTRAINT "envio_servicio_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicio_externo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envio_servicio" ADD CONSTRAINT "envio_servicio_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
