import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => {
  const prisma = {
    insumo: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    categoriaInsumo: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    movimientoInsumo: { create: vi.fn() },
    oficina: { findUnique: vi.fn() },
    equipo: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  // Las transacciones corren el callback contra el mismo mock.
  prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  return { prisma };
});

import { registerMovement, createSupply, updateSupply, createCategory } from './supplies.service.js';
import { prisma } from '../../utils/prisma.js';

type Fn = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  insumo: Record<'findUnique' | 'findUniqueOrThrow' | 'findFirst' | 'create' | 'update' | 'updateMany', Fn>;
  categoriaInsumo: Record<'findUnique' | 'findFirst' | 'create' | 'update', Fn>;
  movimientoInsumo: { create: Fn };
  oficina: { findUnique: Fn };
  equipo: { findUnique: Fn };
  $transaction: Fn;
};

const INSUMO = { id: 1, nombre: 'Cable HDMI 1,5 m', stock: 10, unidad: 'unidad', activo: true };

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  db.insumo.findUnique.mockResolvedValue(INSUMO);
  db.insumo.updateMany.mockResolvedValue({ count: 1 });
  db.movimientoInsumo.create.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data));
});

describe('registerMovement — INGRESO', () => {
  it('suma al stock y guarda el stock resultante', async () => {
    db.insumo.findUniqueOrThrow.mockResolvedValue({ ...INSUMO, stock: 15 });

    const { movimiento } = await registerMovement(1, { tipo: 'INGRESO', cantidad: 5, motivo: 'Compra' }, 99);

    expect(db.insumo.updateMany).toHaveBeenCalledWith({ where: { id: 1 }, data: { stock: { increment: 5 } } });
    expect(movimiento).toMatchObject({ tipo: 'INGRESO', cantidad: 5, stockResultante: 15, motivo: 'Compra', usuarioId: 99 });
  });
});

describe('registerMovement — ENTREGA', () => {
  it('resta sólo si alcanza el stock (condición en el mismo UPDATE)', async () => {
    db.insumo.findUniqueOrThrow.mockResolvedValue({ ...INSUMO, stock: 7 });
    db.oficina.findUnique.mockResolvedValue({ id: 6 });
    db.equipo.findUnique.mockResolvedValue({ id: 40 });

    const { movimiento } = await registerMovement(1, {
      tipo: 'ENTREGA', cantidad: 3, oficinaId: 6, equipoSerie: 1234, recibe: 'María',
    }, 99);

    expect(db.insumo.updateMany).toHaveBeenCalledWith({
      where: { id: 1, stock: { gte: 3 } },
      data: { stock: { increment: -3 } },
    });
    expect(movimiento).toMatchObject({
      tipo: 'ENTREGA', cantidad: -3, stockResultante: 7, oficinaId: 6, equipoId: 40, recibe: 'María',
    });
  });

  it('rechaza si no alcanza el stock y no registra movimiento', async () => {
    db.insumo.updateMany.mockResolvedValue({ count: 0 });
    db.insumo.findUnique
      .mockResolvedValueOnce(INSUMO) // validación inicial
      .mockResolvedValueOnce({ stock: 2, unidad: 'unidad' }); // dentro de la transacción

    await expect(registerMovement(1, { tipo: 'ENTREGA', cantidad: 5 }, 99))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('hay 2') });
    expect(db.movimientoInsumo.create).not.toHaveBeenCalled();
  });

  it('404 si la serie del equipo no existe', async () => {
    db.equipo.findUnique.mockResolvedValue(null);
    await expect(registerMovement(1, { tipo: 'ENTREGA', cantidad: 1, equipoSerie: 9999 }, 99))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(db.insumo.updateMany).not.toHaveBeenCalled();
  });
});

describe('registerMovement — AJUSTE', () => {
  it('fija el stock al conteo y registra la diferencia con signo', async () => {
    db.insumo.findUniqueOrThrow.mockResolvedValue({ ...INSUMO, stock: 8 });

    const { movimiento } = await registerMovement(1, { tipo: 'AJUSTE', stockReal: 8, motivo: 'Conteo' }, 99);

    expect(db.insumo.updateMany).toHaveBeenCalledWith({ where: { id: 1, stock: 10 }, data: { stock: 8 } });
    expect(movimiento).toMatchObject({ tipo: 'AJUSTE', cantidad: -2, stockResultante: 8 });
  });

  it('rechaza si el conteo coincide con el stock', async () => {
    await expect(registerMovement(1, { tipo: 'AJUSTE', stockReal: 10, motivo: 'x' }, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('409 si el stock cambió durante el conteo', async () => {
    db.insumo.updateMany.mockResolvedValue({ count: 0 });
    await expect(registerMovement(1, { tipo: 'AJUSTE', stockReal: 3, motivo: 'x' }, 99))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(db.movimientoInsumo.create).not.toHaveBeenCalled();
  });
});

describe('registerMovement — validaciones comunes', () => {
  it('rechaza movimientos de un insumo dado de baja', async () => {
    db.insumo.findUnique.mockResolvedValue({ ...INSUMO, activo: false });
    await expect(registerMovement(1, { tipo: 'INGRESO', cantidad: 1 }, 99)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404 si el insumo no existe', async () => {
    db.insumo.findUnique.mockResolvedValue(null);
    await expect(registerMovement(1, { tipo: 'INGRESO', cantidad: 1 }, 99)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('createSupply', () => {
  beforeEach(() => {
    db.categoriaInsumo.findUnique.mockResolvedValue({ id: 3 });
    db.insumo.findFirst.mockResolvedValue(null);
    db.insumo.create.mockResolvedValue({ ...INSUMO, id: 5, stock: 0 });
  });

  it('crea en 0 sin movimientos si no hay ingreso inicial', async () => {
    await createSupply({ nombre: 'Cable VGA', categoriaId: 3 }, 99);
    expect(db.insumo.create).toHaveBeenCalledWith({
      data: { nombre: 'Cable VGA', categoriaId: 3, unidad: 'unidad', observacion: null },
    });
    expect(db.movimientoInsumo.create).not.toHaveBeenCalled();
  });

  it('registra el ingreso inicial como movimiento', async () => {
    db.insumo.findUniqueOrThrow.mockResolvedValue({ ...INSUMO, id: 5, stock: 20 });
    await createSupply({ nombre: 'Pila AA', categoriaId: 3, unidad: 'pila', ingresoInicial: 20 }, 99);
    expect(db.movimientoInsumo.create.mock.calls[0][0].data).toMatchObject({
      insumoId: 5, tipo: 'INGRESO', cantidad: 20, stockResultante: 20, motivo: 'Ingreso inicial',
    });
  });

  it('409 con nombre repetido sin importar mayúsculas', async () => {
    db.insumo.findFirst.mockResolvedValue({ nombre: 'Cable VGA', activo: true });
    await expect(createSupply({ nombre: 'cable vga', categoriaId: 3 }, 99)).rejects.toMatchObject({ statusCode: 409 });
    expect(db.insumo.findFirst.mock.calls[0][0].where.nombre).toEqual({ equals: 'cable vga', mode: 'insensitive' });
  });

  it('404 si la categoría no existe', async () => {
    db.categoriaInsumo.findUnique.mockResolvedValue(null);
    await expect(createSupply({ nombre: 'X', categoriaId: 77 }, 99)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('updateSupply', () => {
  it('no permite tocar el stock por edición (sólo pasa los campos del catálogo)', async () => {
    db.insumo.update.mockResolvedValue(INSUMO);
    await updateSupply(1, { activo: false });
    expect(db.insumo.update).toHaveBeenCalledWith(expect.objectContaining({ data: { activo: false } }));
  });
});

describe('createCategory', () => {
  it('409 si ya existe con otra capitalización', async () => {
    db.categoriaInsumo.findFirst.mockResolvedValue({ nombre: 'Cables' });
    await expect(createCategory({ nombre: 'CABLES' })).rejects.toMatchObject({ statusCode: 409 });
  });
});
