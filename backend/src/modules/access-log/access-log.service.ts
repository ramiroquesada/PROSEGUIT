import type { Request } from 'express';
import type { EventoAcceso } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { logger } from '../../utils/logger.js';
import { paginatedResult, type PaginationParams } from '../../utils/pagination.js';

// Bloqueo por intentos fallidos
export const MAX_INTENTOS_FALLIDOS = 5;
export const VENTANA_BLOQUEO_MS = 15 * 60 * 1000;

export interface AccessContext {
  ip: string | null;
  userAgent: string | null;
}

// nginx manda la IP real del cliente en X-Real-IP; en dev no hay proxy.
export function getAccessContext(req: Request): AccessContext {
  const realIp = req.headers['x-real-ip'];
  const ip = (typeof realIp === 'string' && realIp) || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] ?? null;
  return {
    ip: ip ? ip.replace(/^::ffff:/, '').slice(0, 64) : null,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
  };
}

interface AccessEntry {
  evento: EventoAcceso;
  ficha?: number | null;
  usuarioId?: number | null;
  actorId?: number | null;
}

// Nunca debe romper la operación que se está registrando (login, logout...).
export async function recordAccess(entry: AccessEntry, ctx?: AccessContext) {
  try {
    await prisma.registroAcceso.create({
      data: {
        evento: entry.evento,
        ficha: entry.ficha ?? null,
        usuarioId: entry.usuarioId ?? null,
        actorId: entry.actorId ?? null,
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, evento: entry.evento }, 'No se pudo guardar el registro de acceso');
  }
}

/**
 * Cuenta los intentos fallidos de la ficha dentro de la ventana, a partir del
 * último login correcto o reset de contraseña (cualquiera de los dos desbloquea).
 * Devuelve los minutos que faltan para desbloquear, o 0 si no está bloqueada.
 */
export async function getLockMinutesLeft(ficha: number, now = new Date()): Promise<number> {
  const windowStart = new Date(now.getTime() - VENTANA_BLOQUEO_MS);

  const lastUnlock = await prisma.registroAcceso.findFirst({
    where: { ficha, evento: { in: ['LOGIN_OK', 'RESET_PASSWORD'] }, fecha: { gte: windowStart } },
    orderBy: { fecha: 'desc' },
    select: { fecha: true },
  });
  const since = lastUnlock ? lastUnlock.fecha : windowStart;

  const fallos = await prisma.registroAcceso.findMany({
    where: { ficha, evento: 'LOGIN_FALLIDO', fecha: { gt: since } },
    orderBy: { fecha: 'desc' },
    take: MAX_INTENTOS_FALLIDOS,
    select: { fecha: true },
  });
  if (fallos.length < MAX_INTENTOS_FALLIDOS) return 0;

  // Se desbloquea cuando el más viejo de los últimos N fallos sale de la ventana
  const oldest = fallos[fallos.length - 1].fecha.getTime();
  const msLeft = oldest + VENTANA_BLOQUEO_MS - now.getTime();
  return msLeft > 0 ? Math.ceil(msLeft / 60_000) : 0;
}

interface AccessFilters {
  evento?: string;
  ficha?: number;
  desde?: Date;
  hasta?: Date;
}

export async function listAccess(pagination: PaginationParams, filters: AccessFilters) {
  const where: any = {};
  if (filters.evento) where.evento = filters.evento;
  if (filters.ficha) where.ficha = filters.ficha;
  if (filters.desde || filters.hasta) {
    where.fecha = {};
    if (filters.desde) where.fecha.gte = filters.desde;
    // "hasta" viene como día: incluir el día completo
    if (filters.hasta) where.fecha.lt = new Date(filters.hasta.getTime() + 24 * 60 * 60 * 1000);
  }

  const [data, total] = await Promise.all([
    prisma.registroAcceso.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true, ficha: true } },
        actor: { select: { id: true, nombre: true, ficha: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.registroAcceso.count({ where }),
  ]);

  return paginatedResult(data, total, pagination);
}

export async function getSummary(now = new Date()) {
  const desde = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [loginsOk, fallidos, bloqueos] = await Promise.all([
    prisma.registroAcceso.count({ where: { evento: 'LOGIN_OK', fecha: { gte: desde } } }),
    prisma.registroAcceso.count({
      where: { evento: { in: ['LOGIN_FALLIDO', 'USUARIO_INEXISTENTE', 'USUARIO_INACTIVO'] }, fecha: { gte: desde } },
    }),
    prisma.registroAcceso.count({ where: { evento: 'USUARIO_BLOQUEADO', fecha: { gte: desde } } }),
  ]);
  return { loginsOk, fallidos, bloqueos };
}
