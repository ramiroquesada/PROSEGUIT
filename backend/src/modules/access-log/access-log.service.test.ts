import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    registroAcceso: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getLockMinutesLeft, getAccessContext, VENTANA_BLOQUEO_MS } from './access-log.service.js';
import { prisma } from '../../utils/prisma.js';

const mockPrisma = prisma as unknown as {
  registroAcceso: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
};

const now = new Date('2026-09-21T12:00:00Z');
const minutesAgo = (m: number) => ({ fecha: new Date(now.getTime() - m * 60_000) });

describe('getLockMinutesLeft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.registroAcceso.findFirst.mockResolvedValue(null);
  });

  it('devuelve 0 con menos de 5 fallos', async () => {
    mockPrisma.registroAcceso.findMany.mockResolvedValue([minutesAgo(1), minutesAgo(2)]);
    expect(await getLockMinutesLeft(1234, now)).toBe(0);
  });

  it('calcula los minutos hasta que el fallo más viejo sale de la ventana', async () => {
    // El más viejo fue hace 10 min → faltan 5 min de una ventana de 15
    mockPrisma.registroAcceso.findMany.mockResolvedValue([1, 2, 3, 4, 10].map(minutesAgo));
    expect(await getLockMinutesLeft(1234, now)).toBe(5);
  });

  it('cuenta fallos solo después del último login correcto o reset', async () => {
    mockPrisma.registroAcceso.findFirst.mockResolvedValue(minutesAgo(3));
    mockPrisma.registroAcceso.findMany.mockResolvedValue([]);

    await getLockMinutesLeft(1234, now);

    const where = mockPrisma.registroAcceso.findMany.mock.calls[0][0].where;
    expect(where.fecha.gt).toEqual(minutesAgo(3).fecha);
  });

  it('sin desbloqueo previo, mira desde el inicio de la ventana', async () => {
    mockPrisma.registroAcceso.findMany.mockResolvedValue([]);
    await getLockMinutesLeft(1234, now);
    const where = mockPrisma.registroAcceso.findMany.mock.calls[0][0].where;
    expect(where.fecha.gt).toEqual(new Date(now.getTime() - VENTANA_BLOQUEO_MS));
  });
});

describe('getAccessContext', () => {
  const req = (headers: Record<string, string>, remoteAddress = '::ffff:127.0.0.1') =>
    ({ headers, socket: { remoteAddress } }) as unknown as Request;

  it('usa X-Real-IP de nginx cuando está', () => {
    expect(getAccessContext(req({ 'x-real-ip': '192.168.1.20', 'user-agent': 'Chrome' })))
      .toEqual({ ip: '192.168.1.20', userAgent: 'Chrome' });
  });

  it('sin proxy usa la IP del socket, sin el prefijo IPv6-mapped', () => {
    expect(getAccessContext(req({})).ip).toBe('127.0.0.1');
  });
});
