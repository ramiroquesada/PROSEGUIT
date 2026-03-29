import { Prisma, EstadoEquipo } from '@prisma/client';
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
  sortBy?: 'serie' | 'modelo' | 'tipo';
  sortDir?: 'asc' | 'desc';
}

// Patrones de nombre de oficina que determinan el estado
const SOPORTE_PATTERN  = { contains: 'soporte',  mode: 'insensitive' as const };
const DEPOSITO_PATTERNS = [
  { contains: 'deposito',  mode: 'insensitive' as const },
  { contains: 'dep\u00f3sito', mode: 'insensitive' as const },
];
// NUEVO, PRESTADO y EN_SERVICIO_EXTERNO son estados "reales" en DB (no se derivan del nombre de oficina)
const ESPECIALES: EstadoEquipo[] = ['NUEVO', 'PRESTADO', 'EN_SERVICIO_EXTERNO'];

export async function listEquipment(pagination: PaginationParams, filters: EquipmentFilters) {
  const where: Prisma.EquipoWhereInput = {};
  const andConditions: Prisma.EquipoWhereInput[] = [];

  if (filters.tipoEquipoId) where.tipoEquipoId = filters.tipoEquipoId;

  // Filtro de ubicación en cascada: oficina > seccion > ciudad
  if (filters.oficinaId) {
    where.oficinaId = filters.oficinaId;
  } else if (filters.seccionId) {
    andConditions.push({ oficina: { seccionId: filters.seccionId } });
  } else if (filters.ciudadId) {
    andConditions.push({ oficina: { seccion: { ciudadId: filters.ciudadId } } });
  }

  // Filtro de estado
  // NUEVO, PRESTADO, EN_SERVICIO_EXTERNO → filtrar por campo DB directamente
  // EN_REPARACION, EN_DEPOSITO, ACTIVO → derivar del nombre de oficina
  if (filters.estado === 'NUEVO') {
    andConditions.push({ estado: 'NUEVO' });
  } else if (filters.estado === 'EN_REPARACION') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      oficina: { nombre: SOPORTE_PATTERN },
    });
  } else if (filters.estado === 'EN_DEPOSITO') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      OR: DEPOSITO_PATTERNS.map((p) => ({ oficina: { nombre: p } })),
    });
  } else if (filters.estado === 'ACTIVO') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      NOT: {
        OR: [
          { oficina: { nombre: SOPORTE_PATTERN } },
          ...DEPOSITO_PATTERNS.map((p) => ({ oficina: { nombre: p } })),
        ],
      },
    });
  } else if (filters.estado) {
    // PRESTADO, EN_SERVICIO_EXTERNO — filtrar por campo DB directamente
    andConditions.push({ estado: filters.estado as EstadoEquipo });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  if (filters.search) {
    const searchNum = Number(filters.search);
    where.OR = [
      { modelo:      { contains: filters.search, mode: 'insensitive' } },
      { observacion: { contains: filters.search, mode: 'insensitive' } },
      { ip:          { contains: filters.search, mode: 'insensitive' } },
      { tipoEquipo:  { nombre: { contains: filters.search, mode: 'insensitive' } } },
      { oficina:     { nombre: { contains: filters.search, mode: 'insensitive' } } },
      { oficina:     { seccion: { nombre: { contains: filters.search, mode: 'insensitive' } } } },
      { oficina:     { seccion: { ciudad: { nombre: { contains: filters.search, mode: 'insensitive' } } } } },
      ...(Number.isInteger(searchNum) && searchNum > 0 ? [{ serie: searchNum }] : []),
    ];
  }

  let orderBy: Prisma.EquipoOrderByWithRelationInput;
  if (filters.sortBy === 'serie') {
    orderBy = { serie: filters.sortDir ?? 'asc' };
  } else if (filters.sortBy === 'modelo') {
    orderBy = { modelo: filters.sortDir ?? 'asc' };
  } else if (filters.sortBy === 'tipo') {
    orderBy = { tipoEquipo: { nombre: filters.sortDir ?? 'asc' } };
  } else {
    orderBy = { updatedAt: 'desc' };
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
      orderBy,
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
      estado: 'NUEVO',
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
  motivo: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  if (data.serie && data.serie !== equipo.serie) {
    const existing = await prisma.equipo.findUnique({ where: { serie: data.serie } });
    if (existing) throw new AppError(409, 'Ya existe un equipo con ese número de serie');
  }

  const { especificaciones, motivo, ...rest } = data;

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
          motivo,
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

/** Deriva el estado de un equipo según el nombre de la oficina destino */
function estadoPorOficina(nombreOficina: string): 'ACTIVO' | 'EN_REPARACION' | 'EN_DEPOSITO' {
  const n = nombreOficina.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('deposito')) return 'EN_DEPOSITO';
  if (n.includes('soporte')) return 'EN_REPARACION';
  return 'ACTIVO';
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

  const oficinaDest = await prisma.oficina.findUnique({ where: { id: data.oficinaDestinoId } });
  if (!oficinaDest) throw new AppError(404, 'Oficina destino no encontrada');

  const nuevoEstado = estadoPorOficina(oficinaDest.nombre);
  let accionHistorial: 'ASIGNACION' | 'RETORNO_SOPORTE' | 'TRANSFERENCIA';
  if (equipo.estado === 'EN_REPARACION') {
    accionHistorial = 'RETORNO_SOPORTE';
  } else if (equipo.estado === 'NUEVO' || equipo.estado === 'EN_DEPOSITO') {
    accionHistorial = 'ASIGNACION';
  } else {
    accionHistorial = 'TRANSFERENCIA';
  }

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      oficinaId: data.oficinaDestinoId,
      estado: nuevoEstado,
      historial: {
        create: {
          accion: accionHistorial,
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
  oficinaDestinoId?: number;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'EN_REPARACION',
      ...(data.oficinaDestinoId ? { oficinaId: data.oficinaDestinoId } : {}),
      historial: {
        create: {
          accion: 'ENVIO_SOPORTE',
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

export async function returnFromService(id: number, data: {
  motivo: string;
  diagnostico?: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.estado !== 'EN_SERVICIO_EXTERNO') {
    throw new AppError(400, 'El equipo no está en servicio externo');
  }

  // Cerrar el EnvioServicio más reciente abierto
  const envioAbierto = await prisma.envioServicio.findFirst({
    where: { equipoId: id, fechaRetorno: null },
    orderBy: { fechaEnvio: 'desc' },
  });

  if (envioAbierto) {
    await prisma.envioServicio.update({
      where: { id: envioAbierto.id },
      data: {
        fechaRetorno: new Date(),
        diagnostico: data.diagnostico,
      },
    });
  }

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'ACTIVO',
      historial: {
        create: {
          accion: 'RETORNO_SERVICIO_EXTERNO',
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

/** Devuelve el próximo número de serie disponible (máximo actual + 1) */
export async function getNextSerie(): Promise<number> {
  const result = await prisma.equipo.aggregate({ _max: { serie: true } });
  return (result._max.serie ?? 0) + 1;
}
