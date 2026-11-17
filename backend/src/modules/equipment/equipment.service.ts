import { Prisma, EstadoEquipo, EtapaStock } from '@prisma/client';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { PaginationParams } from '../../utils/pagination.js';
import { paginatedResult } from '../../utils/pagination.js';
import { estadoPorOficina } from '../../utils/equipment-status.js';

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

// NUEVO, PRESTADO y EN_SERVICIO_EXTERNO son estados "reales" en DB (no se derivan de la oficina)
const ESPECIALES: EstadoEquipo[] = ['NUEVO', 'PRESTADO', 'EN_SERVICIO_EXTERNO'];

async function getMaintenanceOffice() {
  const oficina = await prisma.oficina.findFirst({
    where: { tipo: 'MANTENIMIENTO' },
    include: { seccion: { include: { ciudad: true } } },
  });
  if (!oficina) {
    throw new AppError(409, 'No hay una oficina de Mantenimiento configurada');
  }
  return oficina;
}

async function getStockOffice() {
  const oficina = await prisma.oficina.findFirst({
    where: { tipo: 'STOCK' },
    include: { seccion: { include: { ciudad: true } } },
  });
  if (!oficina) {
    throw new AppError(409, 'No hay una oficina de Stock configurada');
  }
  return oficina;
}

/** Campos de stock al entrar físicamente a la oficina de Stock. */
function entradaAStock(etapa: EtapaStock) {
  return { stockEtapa: etapa, stockDesde: new Date() };
}

/** Campos de stock al salir físicamente de la oficina de Stock. */
const SALIDA_DE_STOCK = { stockEtapa: null, stockDesde: null };

export async function listEquipment(pagination: PaginationParams, filters: EquipmentFilters) {
  const where: Prisma.EquipoWhereInput = {};
  const andConditions: Prisma.EquipoWhereInput[] = [];

  if (filters.tipoEquipoId) where.tipoEquipoId = filters.tipoEquipoId;

  // La jerarquía agrupa por oficina asignada. La ubicación física temporal
  // se muestra en el resultado, pero no mueve al equipo de su oficina dueña.
  if (filters.oficinaId) {
    const oficinaFiltro = await prisma.oficina.findUnique({
      where: { id: filters.oficinaId },
      select: { tipo: true },
    });
    if (oficinaFiltro?.tipo === 'MANTENIMIENTO') {
      where.oficinaId = filters.oficinaId;
    } else {
      where.oficinaAsignadaId = filters.oficinaId;
    }
  } else if (filters.seccionId) {
    andConditions.push({ oficinaAsignada: { seccionId: filters.seccionId } });
  } else if (filters.ciudadId) {
    andConditions.push({ oficinaAsignada: { seccion: { ciudadId: filters.ciudadId } } });
  }

  // Filtro de estado
  // NUEVO, PRESTADO, EN_SERVICIO_EXTERNO → filtrar por campo DB directamente
  // EN_REPARACION, EN_DEPOSITO, ACTIVO → derivar del tipo de oficina
  if (filters.estado === 'NUEVO') {
    andConditions.push({ estado: 'NUEVO' });
  } else if (filters.estado === 'EN_REPARACION') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      oficina: { tipo: 'MANTENIMIENTO' },
    });
  } else if (filters.estado === 'EN_DEPOSITO') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      oficina: { tipo: 'DEPOSITO' },
    });
  } else if (filters.estado === 'DISPONIBLE') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      oficina: { tipo: 'STOCK' },
    });
  } else if (filters.estado === 'ACTIVO') {
    andConditions.push({
      estado: { notIn: ESPECIALES },
      oficina: { tipo: { in: ['OFICINA', 'SOPORTE'] } },
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
      { matricula:   { contains: filters.search, mode: 'insensitive' } },
      { asignadoA:   { contains: filters.search, mode: 'insensitive' } },
      { nroInventario: { contains: filters.search, mode: 'insensitive' } },
      { observacion: { contains: filters.search, mode: 'insensitive' } },
      { ip:          { contains: filters.search, mode: 'insensitive' } },
      { mac:         { contains: filters.search, mode: 'insensitive' } },
      { tipoEquipo:  { nombre: { contains: filters.search, mode: 'insensitive' } } },
      { oficina:     { nombre: { contains: filters.search, mode: 'insensitive' } } },
      { oficina:     { seccion: { nombre: { contains: filters.search, mode: 'insensitive' } } } },
      { oficina:     { seccion: { ciudad: { nombre: { contains: filters.search, mode: 'insensitive' } } } } },
      { oficinaAsignada: { nombre: { contains: filters.search, mode: 'insensitive' } } },
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
        oficinaAsignada: {
          include: { seccion: { include: { ciudad: true } } },
        },
        template: true,
      },
      orderBy,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.equipo.count({ where }),
  ]);

  return paginatedResult(data, total, pagination);
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
      oficinaAsignada: {
        include: {
          seccion: {
            include: { ciudad: true },
          },
        },
      },
      template: true,
      imagenes: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      historial: {
        include: {
          usuario: { select: { nombre: true, ficha: true } },
          oficinaOrigen: { select: { nombre: true } },
          oficinaDestino: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: 50,
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
  ip?: string;
  mac?: string;
  matricula?: string;
  asignadoA?: string;
  proveedor?: string;
  fechaAdquisicion?: Date | null;
  nroInventario?: string;
  garantiaHasta?: Date | null;
  fechaFinVida?: Date | null;
  precioCompra?: number | null;
  observacion?: string;
  especificaciones?: Prisma.InputJsonValue;
}, usuarioId: number) {
  const existing = await prisma.equipo.findUnique({ where: { serie: data.serie } });
  if (existing) throw new AppError(409, 'Ya existe un equipo con ese número de serie');

  if (data.matricula) {
    const dup = await prisma.equipo.findUnique({ where: { matricula: data.matricula } });
    if (dup) throw new AppError(409, 'Ya existe un equipo con esa matrícula');
  }

  // Validate templateId if provided
  if (data.templateId) {
    const template = await prisma.modeloTemplate.findUnique({
      where: { id: data.templateId },
    });
    if (!template) throw new AppError(404, 'Plantilla no encontrada');
    if (template.tipoEquipoId !== data.tipoEquipoId) {
      throw new AppError(400, 'La plantilla no corresponde al tipo de equipo seleccionado');
    }
  }

  // Todo equipo nuevo entra al Stock: queda NUEVO, disponible y listo para entregar.
  const stock = await getStockOffice();

  const equipo = await prisma.equipo.create({
    data: {
      serie: data.serie,
      modelo: data.modelo,
      templateId: data.templateId,
      tipoEquipoId: data.tipoEquipoId,
      oficinaId: stock.id,
      oficinaAsignadaId: stock.id,
      estado: 'NUEVO',
      ...entradaAStock('LISTO'),
      ip: data.ip,
      mac: data.mac,
      matricula: data.matricula,
      asignadoA: data.asignadoA,
      proveedor: data.proveedor,
      fechaAdquisicion: data.fechaAdquisicion,
      nroInventario: data.nroInventario,
      garantiaHasta: data.garantiaHasta,
      fechaFinVida: data.fechaFinVida,
      precioCompra: data.precioCompra,
      observacion: data.observacion,
      especificaciones: data.especificaciones ?? Prisma.JsonNull,
      historial: {
        create: {
          accion: 'CREACION',
          oficinaDestinoId: stock.id,
          usuarioId,
          motivo: 'Alta de equipo',
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: true,
      oficinaAsignada: true,
    },
  });

  return equipo;
}

export async function updateEquipment(id: number, data: {
  serie?: number;
  modelo?: string;
  templateId?: number;
  tipoEquipoId?: number;
  ip?: string;
  mac?: string;
  matricula?: string;
  asignadoA?: string;
  proveedor?: string;
  fechaAdquisicion?: Date | null;
  nroInventario?: string;
  garantiaHasta?: Date | null;
  fechaFinVida?: Date | null;
  precioCompra?: number | null;
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

  if (data.matricula && data.matricula !== equipo.matricula) {
    const dup = await prisma.equipo.findUnique({ where: { matricula: data.matricula } });
    if (dup) throw new AppError(409, 'Ya existe un equipo con esa matrícula');
  }

  // Determine the final tipoEquipoId to validate against
  const finalTipoEquipoId = data.tipoEquipoId ?? equipo.tipoEquipoId;

  // Validate templateId if provided
  if (data.templateId !== undefined) {
    if (data.templateId !== null) {
      const template = await prisma.modeloTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (!template) throw new AppError(404, 'Plantilla no encontrada');
      if (template.tipoEquipoId !== finalTipoEquipoId) {
        throw new AppError(400, 'La plantilla no corresponde al tipo de equipo seleccionado');
      }
    }
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
          oficinaDestinoId: equipo.oficinaId,
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

export async function transferEquipment(id: number, data: {
  oficinaDestinoId: number;
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: { oficina: true },
  });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');

  if (equipo.oficina.tipo === 'STOCK') {
    return assignFromStock(equipo, data, usuarioId);
  }

  if (equipo.oficina.tipo !== 'MANTENIMIENTO') {
    throw new AppError(400, 'La oficina asignada sólo se puede cambiar mientras el equipo está en Mantenimiento o en Stock');
  }
  if (equipo.oficinaAsignadaId === data.oficinaDestinoId) {
    throw new AppError(400, 'El equipo ya tiene esa oficina asignada');
  }

  const oficinaDest = await prisma.oficina.findUnique({ where: { id: data.oficinaDestinoId } });
  if (!oficinaDest) throw new AppError(404, 'Oficina destino no encontrada');
  if (oficinaDest.tipo === 'MANTENIMIENTO') {
    throw new AppError(400, 'Mantenimiento es una ubicación temporal y no puede ser la oficina asignada');
  }

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      oficinaAsignadaId: data.oficinaDestinoId,
      historial: {
        create: {
          accion: 'TRANSFERENCIA',
          oficinaOrigenId: equipo.oficinaAsignadaId,
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
      oficinaAsignada: {
        include: { seccion: { include: { ciudad: true } } },
      },
    },
  });

  return updated;
}

/**
 * Asignación desde Stock: el equipo sale físicamente del stock y queda
 * en la oficina destino (ubicación actual y asignada a la vez).
 */
async function assignFromStock(
  equipo: { id: number; estado: EstadoEquipo; oficinaId: number },
  data: { oficinaDestinoId: number; motivo: string; comentario?: string },
  usuarioId: number,
) {
  if (equipo.estado === 'PRESTADO') throw new AppError(400, 'El equipo está prestado');
  if (equipo.estado === 'EN_SERVICIO_EXTERNO') throw new AppError(400, 'El equipo está en servicio externo');

  const oficinaDest = await prisma.oficina.findUnique({ where: { id: data.oficinaDestinoId } });
  if (!oficinaDest) throw new AppError(404, 'Oficina destino no encontrada');
  if (oficinaDest.tipo === 'MANTENIMIENTO') {
    throw new AppError(400, 'Para revisar un equipo del stock usá ENTRADA');
  }
  if (oficinaDest.tipo === 'STOCK') {
    throw new AppError(400, 'El equipo ya está en Stock');
  }

  return prisma.equipo.update({
    where: { id: equipo.id },
    data: {
      oficinaId: oficinaDest.id,
      oficinaAsignadaId: oficinaDest.id,
      estado: estadoPorOficina(oficinaDest.tipo),
      ...SALIDA_DE_STOCK,
      historial: {
        create: {
          accion: 'ASIGNACION',
          oficinaOrigenId: equipo.oficinaId,
          oficinaDestinoId: oficinaDest.id,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: { include: { seccion: { include: { ciudad: true } } } },
      oficinaAsignada: { include: { seccion: { include: { ciudad: true } } } },
    },
  });
}

export async function sendToSupport(id: number, data: {
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: { oficina: true },
  });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.estado === 'PRESTADO') throw new AppError(400, 'El equipo está prestado');
  if (equipo.estado === 'EN_SERVICIO_EXTERNO') throw new AppError(400, 'El equipo está en servicio externo');
  if (equipo.oficina.tipo === 'MANTENIMIENTO') {
    throw new AppError(400, 'El equipo ya se encuentra en Mantenimiento');
  }

  const mantenimiento = await getMaintenanceOffice();

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: 'EN_REPARACION',
      oficinaId: mantenimiento.id,
      ...SALIDA_DE_STOCK,
      historial: {
        create: {
          accion: 'ENVIO_SOPORTE',
          oficinaOrigenId: equipo.oficinaId,
          oficinaDestinoId: mantenimiento.id,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
          // Permite que un equipo NUEVO que entra a Mantenimiento sin haberse
          // asignado nunca recupere su condición de nuevo en la SALIDA.
          metadata: { estadoAnterior: equipo.estado },
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: {
        include: { seccion: { include: { ciudad: true } } },
      },
      oficinaAsignada: {
        include: { seccion: { include: { ciudad: true } } },
      },
    },
  });

  return updated;
}

export async function exitEquipment(id: number, data: {
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: { oficina: true, oficinaAsignada: true },
  });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.estado === 'PRESTADO') throw new AppError(400, 'El equipo está prestado');
  if (equipo.estado === 'EN_SERVICIO_EXTERNO') throw new AppError(400, 'El equipo está en servicio externo');
  if (equipo.oficina.tipo !== 'MANTENIMIENTO') {
    throw new AppError(400, 'Sólo se puede dar SALIDA a un equipo que está en Mantenimiento');
  }
  if (equipo.oficinaAsignada.tipo === 'MANTENIMIENTO') {
    throw new AppError(409, 'El equipo no tiene una oficina asignada válida');
  }

  // "Nuevo" = nunca asignado a una oficina. Si estaba NUEVO al recibir la
  // ENTRADA (p. ej. falla de fábrica detectada en Stock), lo sigue siendo.
  let esNuevo = equipo.estado === 'NUEVO';
  if (!esNuevo) {
    const entrada = await prisma.historial.findFirst({
      where: { equipoId: id, accion: 'ENVIO_SOPORTE' },
      orderBy: { fecha: 'desc' },
      select: { metadata: true },
    });
    const meta = entrada?.metadata as { estadoAnterior?: string } | null | undefined;
    esNuevo = meta?.estadoAnterior === 'NUEVO';
  }
  const vaAStock = equipo.oficinaAsignada.tipo === 'STOCK';

  // Hacia Stock: un equipo NUEVO conserva su estado y queda listo; el resto
  // queda DISPONIBLE pero "a revisar" hasta que alguien lo marque como listo.
  const destino = vaAStock
    ? {
        estado: esNuevo ? EstadoEquipo.NUEVO : EstadoEquipo.DISPONIBLE,
        ...entradaAStock(esNuevo ? 'LISTO' : 'A_REVISAR'),
      }
    : { estado: estadoPorOficina(equipo.oficinaAsignada.tipo) };

  const accion = vaAStock
    ? (esNuevo ? 'TRANSFERENCIA' : 'RETORNO_SOPORTE')
    : (esNuevo ? 'ASIGNACION' : 'RETORNO_SOPORTE');

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      oficinaId: equipo.oficinaAsignadaId,
      ...destino,
      historial: {
        create: {
          accion,
          oficinaOrigenId: equipo.oficinaId,
          oficinaDestinoId: equipo.oficinaAsignadaId,
          usuarioId,
          motivo: data.motivo,
          comentario: data.comentario,
        },
      },
    },
    include: {
      tipoEquipo: true,
      oficina: { include: { seccion: { include: { ciudad: true } } } },
      oficinaAsignada: { include: { seccion: { include: { ciudad: true } } } },
    },
  });

  return updated;
}

export async function sendToService(id: number, data: {
  servicioId: number;
  motivo: string;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: { oficina: true },
  });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.oficina.tipo !== 'MANTENIMIENTO') {
    throw new AppError(400, 'El equipo debe recibir ENTRADA antes de enviarlo a servicio externo');
  }

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

  // Derivar estado de la oficina actual, no hardcodear ACTIVO
  const oficinaActual = await prisma.oficina.findUnique({ where: { id: equipo.oficinaId } });
  const estadoDerivado = oficinaActual ? estadoPorOficina(oficinaActual.tipo) : 'ACTIVO';

  const updated = await prisma.equipo.update({
    where: { id },
    data: {
      estado: estadoDerivado,
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

/**
 * Equipos físicamente en Stock (disponibles), excluyendo los que están
 * prestados o en servicio externo. Ordenados por antigüedad en stock.
 */
export async function listStock() {
  return prisma.equipo.findMany({
    where: {
      oficina: { tipo: 'STOCK' },
      estado: { notIn: ['PRESTADO', 'EN_SERVICIO_EXTERNO'] },
    },
    select: {
      id: true,
      serie: true,
      modelo: true,
      estado: true,
      stockEtapa: true,
      stockDesde: true,
      garantiaHasta: true,
      createdAt: true,
      tipoEquipo: { select: { id: true, nombre: true } },
      template: { select: { id: true, nombre: true, marca: true } },
    },
    orderBy: [{ stockDesde: 'asc' }, { serie: 'asc' }],
  });
}

/** Cambia la etapa de un equipo en Stock (A revisar ↔ Listo). */
export async function setStockStage(id: number, data: {
  etapa: EtapaStock;
  comentario?: string;
}, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: { oficina: true },
  });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.oficina.tipo !== 'STOCK') {
    throw new AppError(400, 'El equipo no está en Stock');
  }
  if (equipo.stockEtapa === data.etapa) {
    throw new AppError(400, data.etapa === 'LISTO' ? 'El equipo ya está listo' : 'El equipo ya está a revisar');
  }

  return prisma.equipo.update({
    where: { id },
    data: {
      stockEtapa: data.etapa,
      // Si no tenía fecha (equipo cargado a mano en Stock), arranca a contar ahora.
      ...(equipo.stockDesde ? {} : { stockDesde: new Date() }),
      historial: {
        create: {
          accion: 'CAMBIO_ESTADO',
          oficinaDestinoId: equipo.oficinaId,
          usuarioId,
          motivo: data.etapa === 'LISTO' ? 'Revisado: listo para entregar' : 'Marcado para revisar',
          comentario: data.comentario,
          metadata: { stockEtapa: data.etapa },
        },
      },
    },
  });
}

export async function getEquipmentTypes() {
  return prisma.tipoEquipo.findMany({ orderBy: { nombre: 'asc' } });
}

/** Devuelve el próximo número de serie disponible (máximo actual + 1) */
export async function getNextSerie(): Promise<number> {
  const result = await prisma.equipo.aggregate({ _max: { serie: true } });
  return (result._max.serie ?? 0) + 1;
}

/** Agrega una nueva imagen al equipo */
export async function saveEquipmentImage(equipoId: number, uploadedFilePath: string, usuarioId: number, descripcion?: string) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  if (!equipo) {
    await unlink(uploadedFilePath).catch(() => {});
    throw new AppError(404, 'Equipo no encontrado');
  }

  const filename = path.basename(uploadedFilePath);
  const url = `/uploads/equipment/${filename}`;

  const imagen = await prisma.equipoImagen.create({ data: { equipoId, url, descripcion } });

  await prisma.historial.create({
    data: {
      equipoId,
      accion: 'FOTO_AGREGADA',
      usuarioId,
      motivo: 'Foto agregada',
      oficinaDestinoId: equipo.oficinaId,
    },
  });

  return imagen;
}

/** Soft-delete de una imagen del equipo */
export async function deleteEquipmentImage(equipoId: number, imageId: number, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  const imagen = await prisma.equipoImagen.findFirst({ where: { id: imageId, equipoId, deletedAt: null } });
  if (!imagen) throw new AppError(404, 'Imagen no encontrada');

  await prisma.equipoImagen.update({ where: { id: imageId }, data: { deletedAt: new Date() } });

  if (equipo) {
    await prisma.historial.create({
      data: {
        equipoId,
        accion: 'FOTO_ELIMINADA',
        usuarioId,
        motivo: 'Foto eliminada',
        oficinaDestinoId: equipo.oficinaId,
      },
    });
  }
}

/** Actualiza la descripción de una imagen */
export async function updateImageDescription(equipoId: number, imageId: number, descripcion: string | null, usuarioId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
  const imagen = await prisma.equipoImagen.findFirst({ where: { id: imageId, equipoId, deletedAt: null } });
  if (!imagen) throw new AppError(404, 'Imagen no encontrada');

  const updated = await prisma.equipoImagen.update({ where: { id: imageId }, data: { descripcion } });

  if (equipo) {
    await prisma.historial.create({
      data: {
        equipoId,
        accion: 'EDICION',
        usuarioId,
        motivo: 'Descripción de foto actualizada',
        oficinaDestinoId: equipo.oficinaId,
      },
    });
  }

  return updated;
}
