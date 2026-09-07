import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    equipo: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    oficina: {
      findUnique: vi.fn(),
    },
    funcionario: {
      upsert: vi.fn(),
    },
    prestamo: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { createLoan, returnLoan } from './loans.service.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

const mockPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
  equipo: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  oficina: { findUnique: ReturnType<typeof vi.fn> };
  funcionario: { upsert: ReturnType<typeof vi.fn> };
  prestamo: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  mockPrisma.$queryRaw.mockResolvedValue([]);
  mockPrisma.prestamo.count.mockResolvedValue(0);
});

describe('createLoan', () => {
  it('rechaza un equipo inexistente dentro de la transacción', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    await expect(createLoan({
      equipoId: 99,
      oficinaDestinoId: 2,
      solicitanteFicha: 1234,
    }, 1)).rejects.toMatchObject({ statusCode: 404 });

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('rechaza un préstamo activo aunque el estado heredado siga en ACTIVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, oficinaId: 3, estado: 'ACTIVO' });
    mockPrisma.prestamo.findFirst.mockResolvedValue({ id: 10 });

    await expect(createLoan({
      equipoId: 5,
      oficinaDestinoId: 2,
      solicitanteFicha: 1234,
    }, 1)).rejects.toMatchObject({ statusCode: 400 });

    expect(mockPrisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('crea préstamo, estado e historial en la misma transacción', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, oficinaId: 3, estado: 'ACTIVO' });
    mockPrisma.prestamo.findFirst.mockResolvedValue(null);
    mockPrisma.funcionario.upsert.mockResolvedValue({ ficha: 1234 });
    mockPrisma.prestamo.create.mockResolvedValue({ id: 20, equipoId: 5 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 5 });

    const result = await createLoan({
      equipoId: 5,
      oficinaDestinoId: 2,
      solicitanteFicha: 1234,
      motivo: 'Prueba',
    }, 1);

    expect(result).toEqual({ id: 20, equipoId: 5 });
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        estado: 'PRESTADO',
        historial: { create: expect.objectContaining({ accion: 'PRESTAMO' }) },
      }),
    }));
  });
});

describe('returnLoan', () => {
  it('lanza 404 si el préstamo no existe', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue(null);

    await expect(returnLoan(99, { devueltoPorFicha: 1234 }, 1))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('lanza 400 si el préstamo ya fue devuelto', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 1, activo: false, equipoId: 5, equipo: { id: 5, oficinaId: 3 },
    });

    await expect(returnLoan(1, { devueltoPorFicha: 1234 }, 1))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('deriva estado ACTIVO si la oficina del equipo es estándar', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 1, activo: true, equipoId: 5, equipo: { id: 5, oficinaId: 3 },
    });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 3, nombre: 'Oficina General', tipo: 'OFICINA' });
    mockPrisma.prestamo.update.mockResolvedValue({ id: 1 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 5 });

    await returnLoan(1, { devueltoPorFicha: 1234 }, 1);

    expect(mockPrisma.oficina.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
          historial: expect.objectContaining({ create: expect.objectContaining({ accion: 'DEVOLUCION' }) }),
        }),
      }),
    );
  });

  it('deriva EN_DEPOSITO si la oficina del equipo es tipo depósito', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 2, activo: true, equipoId: 8, equipo: { id: 8, oficinaId: 7 },
    });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 7, nombre: 'Depósito', tipo: 'DEPOSITO' });
    mockPrisma.prestamo.update.mockResolvedValue({ id: 2 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 8 });

    await returnLoan(2, { devueltoPorFicha: 0 }, 1);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_DEPOSITO',
        }),
      }),
    );
  });

  it('deriva ACTIVO si la oficina es Informática - Soporte', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 3, activo: true, equipoId: 10, equipo: { id: 10, oficinaId: 1 },
    });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 1, nombre: 'Informatica - Soporte', tipo: 'SOPORTE' });
    mockPrisma.prestamo.update.mockResolvedValue({ id: 3 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 10 });

    await returnLoan(3, { devueltoPorFicha: 5678 }, 1);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
        }),
      }),
    );
  });

  it('mantiene PRESTADO si otro préstamo heredado continúa activo', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 4, activo: true, equipoId: 12, equipo: { id: 12, oficinaId: 3 },
    });
    mockPrisma.prestamo.update.mockResolvedValue({ id: 4 });
    mockPrisma.prestamo.count.mockResolvedValue(1);
    mockPrisma.equipo.update.mockResolvedValue({ id: 12 });

    await returnLoan(4, { devueltoPorFicha: 0 }, 1);

    expect(mockPrisma.oficina.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: 'PRESTADO' }),
    }));
  });
});
