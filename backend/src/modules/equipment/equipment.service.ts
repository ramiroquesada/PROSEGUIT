import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { PaginationParams } from '../../utils/pagination.js';

interface EquipmentFilters {
  tipoEquipoId?: number;
  estado?: string;
  oficinaId?: number;
  ciudadId?: number;
  seccionId?: number;
  search?: string;
}

export async function listEquipment(pagination: PaginationParams, filters: EquipmentFilters) {
  const where: Prisma.EquipoWhereInput = {};

  if (filters.tipoEquipoId) where.tipoEquipoId = filters.tipoEquipoId;
  if (filters.estado) where.estado = filters.estado as Prisma.EnumEstadoEquipoFilter['equals'];
  if (filters.oficinaId) where.oficinaId = filters.oficinaId;

  if (filters.seccionId) {
    where.oficina = { seccionId: filters.seccionId };
  } else if (filters.ciudadId) {
    where.oficina = { seccion: { ciudadId: filters.ciudadId } };
  }

  if (filters.search) {
    const searchNum = Number(filters.search);
    where.OR = [
      { modelo: { contains: filters.search, mode: 'insensitive' } },
      { observacion: { contains: filters.search, mode: 'insensitive' } },
      { ip: { contains: filters.search, mode: 'insensitive' } },
      ...(Number.isInteger(searchNum) ? [{ serie: searchNum }] : []),
    ];
  }

  const [data, total] = await Promise.all([
    prisma.equipo.findMany({
      where,
      include: {
        tipoEquipo: true,
        oficina: {
          include: {
            seccion: {
              include: { ciudad: true },
            },
          },
        },
        template: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.equipo.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function getEquipmentById(id: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      tipoEquipo: true,
      oficina: {
        include: {
          seccion: {
            include: { ciudad: true },
          },
        },
      },
      template: true,
      historial: {
        include: {
          usuario: { select: { nombre: true, ficha: true } },
          oficinaOrigen: { select: { nombre: true } },
          oficinaDestino: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
      },
    },
  });

  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  return equipo;
}

export async function createEquipment(data: {
  serie: number;
  modelo?: string;
  templateId?: number;
  tipoEquipoId: number;
  oficinaId: number;
  ip?: string;
  urlImage?: string;
  observacion?: string;
  especificaciones?: Prisma.InputJsonValue;
}, usuarioId: number) {
  const existing = await prisma.equipo.findUnique({ where: { serie: data.serie } });
  if (existing) throw new AppError(409, 'Ya existe un equipo con ese número de serie');

  const equipo = await prisma.equipo.create({
    data: {
      serie: data.serie,
      modelo: data.modelo,
      templateId: data.templateId,
      tipoEquipoId: data.tipoEquipoId,
      oficinaId: data.oficinaId,
      estado: 'ACTIVO',
      ip: data.ip,
      urlImage: data.urlImage,
      observacion: data.observacion,
      especificaciones: data.especificaciones ?? Prisma.JsonNull,
      historial: {
        create: {
          accion: 'CREACION',
          oficinaDestinoId: data.oficinaId,
          usuarioId,
          motivo: 'Alta de equipo',
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: true,
    },
  });

  return equipo;
}

export async function updateEquipment(id: number, data: {
  serie?: number;
  modelo?: string;
  templateId?: number;
  tipoEquipoId?: number;
  oficinaId?: number;
  ip?: string;
  urlImage?: string;
  observacion?: string;
  especificaciones?: Prisma.InputJsonValue;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  if (data.serie && data.serie !== equipo.serie) {
    const existing = await prisma.equipo.findUnique({ where: { serie: data.serie } });
    if (existing) throw new AppError(409, 'Ya existe un equipo con ese número de serie');
  }

  const { especificaciones, ...rest } = data;

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      ...rest,
      ...(especificaciones !== undefined ? { especificaciones } : {}),
      historial: {
        create: {
          accion: 'EDICION',
          oficinaDestinoId: data.oficinaId ?? equipo.oficinaId,
          usuarioId,
          motivo: 'Edición de datos del equipo',
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: true,
    },
  });

  return updated;
}

export async function transferEquipment(id: number, data: {
  oficinaDestinoId: number;
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  if (equipo.oficinaId === data.oficinaDestinoId) {
    throw new AppError(400, 'La oficina destino es la misma que la actual');
  }

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      oficinaId: data.oficinaDestinoId,
      estado: 'ACTIVO',
      historial: {
        create: {
          accion: 'TRANSFERENCIA',
          oficinaOrigenId: equipo.oficinaId,
          oficinaDestinoId: data.oficinaDestinoId,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: {
        include: { seccion: { include: { ciudad: true } } },
      },
    },
  });

  return updated;
}

export async function sendToSupport(id: number, data: {
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'EN_REPARACION',
      historial: {
        create: {
          accion: 'ENVIO_SOPORTE',
          oficinaOrigenId: equipo.oficinaId,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
        },
      },
    },
  });

  return updated;
}

export async function sendToService(id: number, data: {
  servicioId: number;
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  const servicio = await prisma.servicioExterno.findUnique({ where: { id: data.servicioId } });
  if (!servicio) throw new AppError(404, 'Servicio externo no encontrado');

  await prisma.envioServicio.create({
    data: {
      equipoId: id,
      servicioId: data.servicioId,
      tecnicoId: usuarioId,
      motivo: data.motivo,
    },
  });

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'EN_SERVICIO_EXTERNO',
      historial: {
        create: {
          accion: 'ENVIO_SERVICIO_EXTERNO',
          oficinaOrigenId: equipo.oficinaId,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
          metadata: { servicioId: data.servicioId, servicioNombre: servicio.nombre },
        },
      },
    },
  });

  return updated;
}

export async function decommission(id: number, data: {
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'DADO_DE_BAJA',
      historial: {
        create: {
          accion: 'BAJA',
          oficinaOrigenId: equipo.oficinaId,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
        },
      },
    },
  });

  return updated;
}

export async function getEquipmentTypes() {
  return prisma.tipoEquipo.findMany({ orderBy: { nombre: 'asc' } });
}
