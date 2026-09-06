import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { paginatedResult, type PaginationParams } from '../../utils/pagination.js';
import { estadoPorOficina } from '../../utils/equipment-status.js';

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

  return paginatedResult(data, total, pagination);
}

export async function createLoan(data: {
  equipoId: number;
  oficinaDestinoId: number;
  solicitanteFicha: number;
  motivo?: string;
}, tecnicoId: number) {
  return prisma.$transaction(async (tx) => {
    // Serializa todos los préstamos del mismo equipo, incluso antes de poder
    // aplicar la restricción única sobre los datos heredados.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1, ${data.equipoId})`;

    const equipo = await tx.equipo.findUnique({ where: { id: data.equipoId } });
    if (!equipo) throw new AppError(404, 'Equipo no encontrado');

    const activeLoan = await tx.prestamo.findFirst({
      where: { equipoId: data.equipoId, activo: true },
      select: { id: true },
    });
    if (activeLoan || equipo.estado === 'PRESTADO') {
      throw new AppError(400, 'El equipo ya está prestado');
    }

    await tx.funcionario.upsert({
      where: { ficha: data.solicitanteFicha },
      update: {},
      create: { ficha: data.solicitanteFicha, nombre: `Funcionario ${data.solicitanteFicha}` },
    });

    const prestamo = await tx.prestamo.create({
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

    await tx.equipo.update({
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
  });
}

export async function returnLoan(prestamoId: number, data: {
  devueltoPorFicha: number;
}, recibidoPorId: number) {
  return prisma.$transaction(async (tx) => {
    // Impide dos devoluciones simultáneas del mismo préstamo.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(2, ${prestamoId})`;

    const prestamo = await tx.prestamo.findUnique({
      where: { id: prestamoId },
      include: { equipo: true },
    });

    if (!prestamo) throw new AppError(404, 'Préstamo no encontrado');
    if (!prestamo.activo) throw new AppError(400, 'El préstamo ya fue devuelto');

    // Serializa cambios de estado del equipo con altas u otras devoluciones.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1, ${prestamo.equipoId})`;

    if (data.devueltoPorFicha > 0) {
      await tx.funcionario.upsert({
        where: { ficha: data.devueltoPorFicha },
        update: {},
        create: { ficha: data.devueltoPorFicha, nombre: `Funcionario ${data.devueltoPorFicha}` },
      });
    }

    const updated = await tx.prestamo.update({
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

    const remainingActiveLoans = await tx.prestamo.count({
      where: { equipoId: prestamo.equipoId, activo: true },
    });

    let nextState: 'PRESTADO' | 'ACTIVO' | 'EN_REPARACION' | 'EN_DEPOSITO' = 'PRESTADO';
    if (remainingActiveLoans === 0) {
      const oficinaEquipo = await tx.oficina.findUnique({ where: { id: prestamo.equipo.oficinaId } });
      nextState = oficinaEquipo ? estadoPorOficina(oficinaEquipo.tipo) : 'ACTIVO';
    }

    await tx.equipo.update({
      where: { id: prestamo.equipoId },
      data: {
        estado: nextState,
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
  });
}
