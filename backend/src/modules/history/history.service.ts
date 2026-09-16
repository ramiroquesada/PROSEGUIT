import { prisma } from '../../utils/prisma.js';
import { paginatedResult, type PaginationParams } from '../../utils/pagination.js';

interface HistoryFilters {
  equipoId?: number;
  accion?: string;
  usuarioId?: number;
  desde?: Date;
  hasta?: Date;
  search?: string;
}

export async function listHistory(pagination: PaginationParams, filters: HistoryFilters) {
  const where: any = {};

  if (filters.equipoId) where.equipoId = filters.equipoId;
  if (filters.accion) where.accion = filters.accion;
  if (filters.usuarioId) where.usuarioId = filters.usuarioId;

  if (filters.desde || filters.hasta) {
    where.fecha = {};
    if (filters.desde) where.fecha.gte = filters.desde;
    if (filters.hasta) where.fecha.lte = filters.hasta;
  }

  if (filters.search) {
    where.OR = [
      { motivo: { contains: filters.search, mode: 'insensitive' } },
      { comentario: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.historial.findMany({
      where,
      include: {
        equipo: { select: { id: true, serie: true, modelo: true, tipoEquipo: { select: { nombre: true } } } },
        usuario: { select: { id: true, nombre: true, ficha: true } },
        oficinaOrigen: { select: { id: true, nombre: true } },
        oficinaDestino: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.historial.count({ where }),
  ]);

  return paginatedResult(data, total, pagination);
}

export async function getEquipmentHistory(equipoId: number) {
  return prisma.historial.findMany({
    where: { equipoId },
    include: {
      usuario: { select: { id: true, nombre: true, ficha: true } },
      oficinaOrigen: { select: { id: true, nombre: true } },
      oficinaDestino: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  });
}
