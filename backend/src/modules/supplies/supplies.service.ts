import { Prisma, TipoMovimientoInsumo } from '@prisma/client';
import type { SupplyMovementInput } from '@proseguit/shared';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { PaginationParams } from '../../utils/pagination.js';
import { paginatedResult } from '../../utils/pagination.js';

type Tx = Prisma.TransactionClient;

const INCLUDE_MOVIMIENTO = {
  usuario: { select: { id: true, nombre: true, ficha: true } },
  oficina: { select: { id: true, nombre: true, seccion: { select: { nombre: true } } } },
  equipo: { select: { id: true, serie: true } },
  insumo: { select: { id: true, nombre: true, unidad: true } },
} satisfies Prisma.MovimientoInsumoInclude;

// ── Categorías ───────────────────────────────────────────────────────────────

export async function listCategories() {
  return prisma.categoriaInsumo.findMany({
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { insumos: true } } },
  });
}

async function assertCategoryNameFree(nombre: string, exceptId?: number) {
  const dup = await prisma.categoriaInsumo.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (dup) throw new AppError(409, `Ya existe la categoría "${dup.nombre}"`);
}

export async function createCategory(data: { nombre: string }) {
  await assertCategoryNameFree(data.nombre);
  return prisma.categoriaInsumo.create({ data: { nombre: data.nombre } });
}

export async function updateCategory(id: number, data: { nombre: string }) {
  const cat = await prisma.categoriaInsumo.findUnique({ where: { id } });
  if (!cat) throw new AppError(404, 'Categoría no encontrada');
  await assertCategoryNameFree(data.nombre, id);
  return prisma.categoriaInsumo.update({ where: { id }, data: { nombre: data.nombre } });
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

export async function listSupplies(filters: { search?: string; categoriaId?: number; incluirInactivos?: boolean }) {
  return prisma.insumo.findMany({
    where: {
      ...(filters.incluirInactivos ? {} : { activo: true }),
      ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
      ...(filters.search ? { nombre: { contains: filters.search, mode: 'insensitive' } } : {}),
    },
    include: {
      categoria: { select: { id: true, nombre: true } },
      movimientos: { orderBy: { fecha: 'desc' }, take: 1, select: { fecha: true, tipo: true } },
    },
    orderBy: [{ categoria: { nombre: 'asc' } }, { nombre: 'asc' }],
  });
}

export async function getSupply(id: number) {
  const insumo = await prisma.insumo.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true } },
      movimientos: { orderBy: { fecha: 'desc' }, take: 100, include: INCLUDE_MOVIMIENTO },
    },
  });
  if (!insumo) throw new AppError(404, 'Insumo no encontrado');
  return insumo;
}

async function assertCategoryExists(id: number) {
  const cat = await prisma.categoriaInsumo.findUnique({ where: { id } });
  if (!cat) throw new AppError(404, 'Categoría no encontrada');
}

async function assertSupplyNameFree(nombre: string, exceptId?: number) {
  const dup = await prisma.insumo.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  if (dup) {
    throw new AppError(409, dup.activo
      ? `Ya existe el insumo "${dup.nombre}"`
      : `Ya existe el insumo "${dup.nombre}" (dado de baja; podés reactivarlo)`);
  }
}

export async function createSupply(data: {
  nombre: string;
  categoriaId: number;
  unidad?: string;
  observacion?: string;
  ingresoInicial?: number;
}, usuarioId: number) {
  await assertCategoryExists(data.categoriaId);
  await assertSupplyNameFree(data.nombre);

  return prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.create({
      data: {
        nombre: data.nombre,
        categoriaId: data.categoriaId,
        unidad: data.unidad || 'unidad',
        observacion: data.observacion || null,
      },
    });
    if (data.ingresoInicial && data.ingresoInicial > 0) {
      return (await aplicarDelta(tx, insumo.id, 'INGRESO', data.ingresoInicial, { motivo: 'Ingreso inicial', usuarioId })).insumo;
    }
    return insumo;
  });
}

export async function updateSupply(id: number, data: {
  nombre?: string;
  categoriaId?: number;
  unidad?: string;
  observacion?: string | null;
  activo?: boolean;
}) {
  const insumo = await prisma.insumo.findUnique({ where: { id } });
  if (!insumo) throw new AppError(404, 'Insumo no encontrado');
  if (data.categoriaId) await assertCategoryExists(data.categoriaId);
  if (data.nombre) await assertSupplyNameFree(data.nombre, id);

  return prisma.insumo.update({
    where: { id },
    data,
    include: { categoria: { select: { id: true, nombre: true } } },
  });
}

// ── Movimientos ──────────────────────────────────────────────────────────────

/**
 * Suma o resta al stock de forma atómica y registra el movimiento. Una resta
 * sólo se aplica si alcanza el stock (la condición va en el mismo UPDATE, así
 * dos entregas simultáneas nunca dejan el stock negativo).
 */
async function aplicarDelta(
  tx: Tx,
  insumoId: number,
  tipo: TipoMovimientoInsumo,
  delta: number,
  extra: { motivo?: string; oficinaId?: number; equipoId?: number; recibe?: string; usuarioId: number },
) {
  const res = await tx.insumo.updateMany({
    where: { id: insumoId, ...(delta < 0 ? { stock: { gte: -delta } } : {}) },
    data: { stock: { increment: delta } },
  });
  if (res.count !== 1) {
    const actual = await tx.insumo.findUnique({ where: { id: insumoId }, select: { stock: true, unidad: true } });
    if (!actual) throw new AppError(404, 'Insumo no encontrado');
    throw new AppError(400, `Stock insuficiente: hay ${actual.stock} y se quieren entregar ${-delta}`);
  }
  const insumo = await tx.insumo.findUniqueOrThrow({ where: { id: insumoId } });
  const movimiento = await tx.movimientoInsumo.create({
    data: {
      insumoId,
      tipo,
      cantidad: delta,
      stockResultante: insumo.stock,
      oficinaId: extra.oficinaId,
      equipoId: extra.equipoId,
      recibe: extra.recibe || null,
      motivo: extra.motivo || null,
      usuarioId: extra.usuarioId,
    },
    include: INCLUDE_MOVIMIENTO,
  });
  return { insumo, movimiento };
}

export async function registerMovement(id: number, data: SupplyMovementInput, usuarioId: number) {
  const insumo = await prisma.insumo.findUnique({ where: { id } });
  if (!insumo) throw new AppError(404, 'Insumo no encontrado');
  if (!insumo.activo) throw new AppError(400, 'El insumo está dado de baja; reactivalo para registrar movimientos');

  if (data.tipo === 'INGRESO') {
    return prisma.$transaction((tx) => aplicarDelta(tx, id, 'INGRESO', data.cantidad, { motivo: data.motivo, usuarioId }));
  }

  if (data.tipo === 'ENTREGA') {
    if (data.oficinaId) {
      const oficina = await prisma.oficina.findUnique({ where: { id: data.oficinaId } });
      if (!oficina) throw new AppError(404, 'Oficina no encontrada');
    }
    let equipoId: number | undefined;
    if (data.equipoSerie) {
      const equipo = await prisma.equipo.findUnique({ where: { serie: data.equipoSerie }, select: { id: true } });
      if (!equipo) throw new AppError(404, `No existe un equipo con serie ${data.equipoSerie}`);
      equipoId = equipo.id;
    }
    return prisma.$transaction((tx) => aplicarDelta(tx, id, 'ENTREGA', -data.cantidad, {
      motivo: data.motivo, oficinaId: data.oficinaId, equipoId, recibe: data.recibe, usuarioId,
    }));
  }

  // AJUSTE: el stock pasa a ser lo contado. La condición sobre el stock leído
  // evita pisar un movimiento que haya entrado en el medio.
  const delta = data.stockReal - insumo.stock;
  if (delta === 0) throw new AppError(400, `El conteo coincide con el stock actual (${insumo.stock})`);
  return prisma.$transaction(async (tx) => {
    const res = await tx.insumo.updateMany({
      where: { id, stock: insumo.stock },
      data: { stock: data.stockReal },
    });
    if (res.count !== 1) throw new AppError(409, 'El stock cambió mientras hacías el conteo; volvé a intentarlo');
    const movimiento = await tx.movimientoInsumo.create({
      data: {
        insumoId: id,
        tipo: 'AJUSTE',
        cantidad: delta,
        stockResultante: data.stockReal,
        motivo: data.motivo,
        usuarioId,
      },
      include: INCLUDE_MOVIMIENTO,
    });
    const actualizado = await tx.insumo.findUniqueOrThrow({ where: { id } });
    return { insumo: actualizado, movimiento };
  });
}

export async function listMovements(pagination: PaginationParams, filters: {
  insumoId?: number;
  categoriaId?: number;
  tipo?: TipoMovimientoInsumo;
  oficinaId?: number;
  desde?: Date;
  hasta?: Date;
}) {
  const where: Prisma.MovimientoInsumoWhereInput = {
    ...(filters.insumoId ? { insumoId: filters.insumoId } : {}),
    ...(filters.categoriaId ? { insumo: { categoriaId: filters.categoriaId } } : {}),
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
    ...(filters.oficinaId ? { oficinaId: filters.oficinaId } : {}),
    ...(filters.desde || filters.hasta
      ? { fecha: { ...(filters.desde ? { gte: filters.desde } : {}), ...(filters.hasta ? { lte: filters.hasta } : {}) } }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.movimientoInsumo.findMany({
      where,
      include: INCLUDE_MOVIMIENTO,
      orderBy: { fecha: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.movimientoInsumo.count({ where }),
  ]);
  return paginatedResult(data, total, pagination);
}
