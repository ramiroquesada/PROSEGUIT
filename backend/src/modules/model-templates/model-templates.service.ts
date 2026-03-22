import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

export async function listTemplates(tipoEquipoId?: number) {
  const where = tipoEquipoId ? { tipoEquipoId } : {};
  return prisma.modeloTemplate.findMany({
    where,
    include: { tipoEquipo: { select: { id: true, nombre: true } } },
    orderBy: { nombre: 'asc' },
  });
}

export async function getTemplateById(id: number) {
  const template = await prisma.modeloTemplate.findUnique({
    where: { id },
    include: {
      tipoEquipo: { select: { id: true, nombre: true } },
      equipos: { select: { id: true, serie: true, modelo: true, estado: true } },
    },
  });
  if (!template) throw new AppError(404, 'Plantilla no encontrada');
  return template;
}

export async function createTemplate(data: {
  nombre: string;
  tipoEquipoId: number;
  marca?: string;
  especificaciones?: Prisma.InputJsonValue;
}) {
  return prisma.modeloTemplate.create({
    data: {
      nombre: data.nombre,
      tipoEquipoId: data.tipoEquipoId,
      marca: data.marca,
      especificaciones: data.especificaciones ?? Prisma.JsonNull,
    },
    include: { tipoEquipo: { select: { id: true, nombre: true } } },
  });
}

export async function updateTemplate(id: number, data: {
  nombre?: string;
  tipoEquipoId?: number;
  marca?: string;
  especificaciones?: Prisma.InputJsonValue;
}) {
  const existing = await prisma.modeloTemplate.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Plantilla no encontrada');

  const { especificaciones, ...rest } = data;
  return prisma.modeloTemplate.update({
    where: { id },
    data: {
      ...rest,
      ...(especificaciones !== undefined ? { especificaciones } : {}),
    },
    include: { tipoEquipo: { select: { id: true, nombre: true } } },
  });
}

export async function deleteTemplate(id: number) {
  const existing = await prisma.modeloTemplate.findUnique({
    where: { id },
    include: { equipos: { select: { id: true }, take: 1 } },
  });
  if (!existing) throw new AppError(404, 'Plantilla no encontrada');
  if (existing.equipos.length > 0) {
    throw new AppError(400, 'No se puede eliminar: hay equipos usando esta plantilla');
  }

  await prisma.modeloTemplate.delete({ where: { id } });
}
