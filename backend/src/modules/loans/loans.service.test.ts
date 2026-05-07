import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { returnLoan } from './loans.service.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

const mockPrisma = prisma as unknown as {
  equipo: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  oficina: { findUnique: ReturnType<typeof vi.fn> };
  funcionario: { upsert: ReturnType<typeof vi.fn> };
  prestamo: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

describe('returnLoan', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 3, nombre: 'Oficina General' });
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
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 7, nombre: 'Depósito' });
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

  it('deriva EN_REPARACION si la oficina es tipo soporte', async () => {
    mockPrisma.prestamo.findUnique.mockResolvedValue({
      id: 3, activo: true, equipoId: 10, equipo: { id: 10, oficinaId: 1 },
    });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 1, nombre: 'Informatica - Soporte' });
    mockPrisma.prestamo.update.mockResolvedValue({ id: 3 });
    mockPrisma.equipo.update.mockResolvedValue({ id: 10 });

    await returnLoan(3, { devueltoPorFicha: 5678 }, 1);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_REPARACION',
        }),
      }),
    );
  });
});
