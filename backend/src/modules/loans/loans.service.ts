import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { PaginationParams } from '../../utils/pagination.js';

interface LoanFilters {
  activo?: boolean;
  equipoId?: number;
  search?: string;
}

export async function listLoans(pagination: PaginationParams, filters: LoanFilters) {
  const where: any = {};

  if (filters.activo !== undefined) where.activo = filters.activo;
  if (filters.equipoId) where.equipoId = filters.equipoId;

  if (filters.search) {
    const searchNum = Number(filters.search);
    where.OR = [
      { solicitante: { nombre: { contains: filters.search, mode: 'insensitive' } } },
      { equipo: { modelo: { contains: filters.search, mode: 'insensitive' } } },
      ...(Number.isInteger(searchNum) ? [
        { equipo: { serie: searchNum } },
        { solicitanteFicha: searchNum },
      ] : []),
    ];
  }

  const [data, total] = await Promise.all([
    prisma.prestamo.findMany({
      where,
      include: {
        equipo: {
          select: { id: true, serie: true, modelo: true, tipoEquipo: { select: { nombre: true } } },
        },
        oficinaDestino: { select: { id: true, nombre: true } },
        solicitante: { select: { ficha: true, nombre: true } },
        tecnico: { select: { id: true, nombre: true, ficha: true } },
        devueltoPor: { select: { ficha: true, nombre: true } },
        recibidoPor: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaPrestamo: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.prestamo.count({ where }),
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

export async function createLoan(data: {
  equipoId: number;
  oficinaDestinoId: number;
  solicitanteFicha: number;
  motivo?: string;
}, tecnicoId: number) {
  const equipo = await prisma.equipo.findUnique({ where: { id: data.equipoId } });
  if (!equipo) throw new AppError(404, 'Equipo no encontrado');
  if (equipo.estado === 'PRESTADO') throw new AppError(400, 'El equipo ya está prestado');

  // Ensure funcionario exists
  await prisma.funcionario.upsert({
    where: { ficha: data.solicitanteFicha },
    update: {},
    create: { ficha: data.solicitanteFicha, nombre: `Funcionario ${data.solicitanteFicha}` },
  });

  const prestamo = await prisma.prestamo.create({
    data: {
      equipoId: data.equipoId,
      oficinaDestinoId: data.oficinaDestinoId,
      solicitanteFicha: data.solicitanteFicha,
      tecnicoId,
      motivo: data.motivo,
      activo: true,
    },
    include: {
      equipo: { select: { id: true, serie: true, modelo: true } },
      solicitante: true,
    },
  });

  // Update equipment status
  await prisma.equipo.update({
    where: { id: data.equipoId },
    data: {
      estado: 'PRESTADO',
      historial: {
        create: {
          accion: 'PRESTAMO',
          oficinaOrigenId: equipo.oficinaId,
          oficinaDestinoId: data.oficinaDestinoId,
          usuarioId: tecnicoId,
          motivo: data.motivo || 'Préstamo de equipo',
        },
      },
    },
  });

  return prestamo;
}

export async function returnLoan(prestamoId: number, data: {
  devueltoPorFicha: number;
}, recibidoPorId: number) {
  const prestamo = await prisma.prestamo.findUnique({
    where: { id: prestamoId },
    include: { equipo: true },
  });

  if (!prestamo) throw new AppError(404, 'Préstamo no encontrado');
  if (!prestamo.activo) throw new AppError(400, 'El préstamo ya fue devuelto');

  // Ensure funcionario exists
  if (data.devueltoPorFicha > 0) {
    await prisma.funcionario.upsert({
      where: { ficha: data.devueltoPorFicha },
      update: {},
      create: { ficha: data.devueltoPorFicha, nombre: `Funcionario ${data.devueltoPorFicha}` },
    });
  }

  const updated = await prisma.prestamo.update({
    where: { id: prestamoId },
    data: {
      activo: false,
      fechaDevolucion: new Date(),
      devueltoPorFicha: data.devueltoPorFicha > 0 ? data.devueltoPorFicha : null,
      recibidoPorId,
    },
    include: {
      equipo: { select: { id: true, serie: true, modelo: true } },
      solicitante: true,
    },
  });

  // Restore equipment status
  await prisma.equipo.update({
    where: { id: prestamo.equipoId },
    data: {
      estado: 'ACTIVO',
      historial: {
        create: {
          accion: 'DEVOLUCION',
          oficinaDestinoId: prestamo.equipo.oficinaId,
          usuarioId: recibidoPorId,
          motivo: 'Devolución de préstamo',
        },
      },
    },
  });

  return updated;
}
