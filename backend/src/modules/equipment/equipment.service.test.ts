import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    equipo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    oficina: {
      findUnique: vi.fn(),
    },
    servicioExterno: {
      findUnique: vi.fn(),
    },
    envioServicio: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { transferEquipment, sendToSupport, createEquipment, getNextSerie, returnFromService } from './equipment.service.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

const mockPrisma = prisma as {
  equipo: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  oficina: { findUnique: ReturnType<typeof vi.fn> };
  servicioExterno: { findUnique: ReturnType<typeof vi.fn> };
  envioServicio: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

// ─── transferEquipment ───────────────────────────────────────────────────────

describe('transferEquipment — accion según estado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('usa ASIGNACION cuando el equipo está en NUEVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'NUEVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Contabilidad' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Primera asignación' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'ASIGNACION' }) },
        }),
      }),
    );
  });

  it('usa ASIGNACION cuando el equipo está EN_DEPOSITO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'EN_DEPOSITO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Tesorería' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Asignación desde depósito' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'ASIGNACION' }) },
        }),
      }),
    );
  });

  it('usa RETORNO_SOPORTE cuando el equipo está EN_REPARACION', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'EN_REPARACION' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Recursos Humanos' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Retorno de reparación' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'RETORNO_SOPORTE' }) },
        }),
      }),
    );
  });

  it('usa TRANSFERENCIA cuando el equipo está ACTIVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Sistemas' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Traslado' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'TRANSFERENCIA' }) },
        }),
      }),
    );
  });

  it('lanza 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    await expect(transferEquipment(999, { oficinaDestinoId: 2, motivo: 'Test' }, 99))
      .rejects.toThrow(AppError);
    await expect(transferEquipment(999, { oficinaDestinoId: 2, motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('lanza 400 si la oficina destino es la misma que la actual', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 5, estado: 'ACTIVO' });

    await expect(transferEquipment(1, { oficinaDestinoId: 5, motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── estadoPorOficina (via transferEquipment) ────────────────────────────────

describe('transferEquipment — estado según nombre de oficina destino', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deriva EN_REPARACION para oficina con "soporte" en el nombre', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 1, nombre: 'Informatica - Soporte' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 1, motivo: 'A soporte' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'EN_REPARACION' }) }),
    );
  });

  it('deriva EN_DEPOSITO para oficina con "deposito" (con tilde) en el nombre', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 3, nombre: 'Depósito General' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 3, motivo: 'A depósito' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'EN_DEPOSITO' }) }),
    );
  });

  it('deriva ACTIVO para cualquier otra oficina', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 4, nombre: 'Contaduría' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 4, motivo: 'Traslado' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'ACTIVO' }) }),
    );
  });
});

// ─── sendToSupport ───────────────────────────────────────────────────────────

describe('sendToSupport', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pone estado EN_REPARACION y registra ENVIO_SOPORTE', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 5, estado: 'ACTIVO' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await sendToSupport(1, { motivo: 'No enciende' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_REPARACION',
          historial: { create: expect.objectContaining({ accion: 'ENVIO_SOPORTE' }) },
        }),
      }),
    );
  });

  it('lanza 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    await expect(sendToSupport(999, { motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createEquipment ─────────────────────────────────────────────────────────

describe('createEquipment', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('crea el equipo con estado NUEVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null); // no existe aún
    mockPrisma.equipo.create.mockResolvedValue({ id: 1, serie: 42, estado: 'NUEVO', tipoEquipo: {}, oficina: {} });

    await createEquipment({ serie: 42, tipoEquipoId: 1, oficinaId: 10 }, 99);

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'NUEVO',
          historial: { create: expect.objectContaining({ accion: 'CREACION' }) },
        }),
      }),
    );
  });

  it('lanza 409 si la serie ya existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, serie: 42 });

    await expect(createEquipment({ serie: 42, tipoEquipoId: 1, oficinaId: 10 }, 99))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── returnFromService ───────────────────────────────────────────────────────

describe('returnFromService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lanza 400 si el equipo no está EN_SERVICIO_EXTERNO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, estado: 'ACTIVO' });

    await expect(returnFromService(1, { motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('pone estado ACTIVO y registra RETORNO_SERVICIO_EXTERNO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, estado: 'EN_SERVICIO_EXTERNO', oficinaId: 3 });
    mockPrisma.envioServicio.findFirst.mockResolvedValue(null); // sin envío abierto
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, estado: 'ACTIVO' });

    await returnFromService(1, { motivo: 'Reparado' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
          historial: { create: expect.objectContaining({ accion: 'RETORNO_SERVICIO_EXTERNO' }) },
        }),
      }),
    );
  });
});

// ─── getNextSerie ─────────────────────────────────────────────────────────────

describe('getNextSerie', () => {
  it('devuelve max + 1', async () => {
    mockPrisma.equipo.aggregate.mockResolvedValue({ _max: { serie: 150 } });
    const next = await getNextSerie();
    expect(next).toBe(151);
  });

  it('devuelve 1 si no hay equipos', async () => {
    mockPrisma.equipo.aggregate.mockResolvedValue({ _max: { serie: null } });
    const next = await getNextSerie();
    expect(next).toBe(1);
  });
});
