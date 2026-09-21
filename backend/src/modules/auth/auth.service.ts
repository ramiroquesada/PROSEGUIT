import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { JwtPayload } from '../../middleware/auth.js';
import { recordAccess, getLockMinutesLeft, type AccessContext } from '../access-log/access-log.service.js';

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

export async function login(ficha: number, password: string, ctx?: AccessContext) {
  const usuario = await prisma.usuario.findUnique({ where: { ficha } });

  if (!usuario) {
    await recordAccess({ evento: 'USUARIO_INEXISTENTE', ficha }, ctx);
    throw new AppError(401, 'Credenciales inválidas');
  }

  // El bloqueo se chequea antes de la contraseña: si no, se podría seguir probando
  const lockMinutes = await getLockMinutesLeft(ficha);
  if (lockMinutes > 0) {
    await recordAccess({ evento: 'USUARIO_BLOQUEADO', ficha, usuarioId: usuario.id }, ctx);
    throw new AppError(429, `Demasiados intentos fallidos. Probá de nuevo en ${lockMinutes} minuto${lockMinutes === 1 ? '' : 's'} o pedile a un administrador que resetee tu contraseña.`);
  }

  if (!usuario.activo) {
    await recordAccess({ evento: 'USUARIO_INACTIVO', ficha, usuarioId: usuario.id }, ctx);
    throw new AppError(401, 'Credenciales inválidas');
  }

  const validPassword = await bcrypt.compare(password, usuario.passwordHash);
  if (!validPassword) {
    await recordAccess({ evento: 'LOGIN_FALLIDO', ficha, usuarioId: usuario.id }, ctx);
    throw new AppError(401, 'Credenciales inválidas');
  }

  const payload: JwtPayload = {
    userId: usuario.id,
    ficha: usuario.ficha,
    rol: usuario.rol.toLowerCase(),
    jti: randomUUID(),
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);

  // Guardar refresh token en DB
  const expiresAt = new Date(Date.now() + parseDuration(env.jwt.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      usuarioId: usuario.id,
      expiresAt,
    },
  });

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  await recordAccess({ evento: 'LOGIN_OK', ficha, usuarioId: usuario.id }, ctx);

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      ficha: usuario.ficha,
      rol: usuario.rol,
      forcePasswordChange: usuario.forcePasswordChange,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { usuario: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new AppError(401, 'Refresh token inválido o expirado');
  }

  try {
    jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, 'Refresh token inválido');
  }

  const payload: JwtPayload = {
    userId: stored.usuario.id,
    ficha: stored.usuario.ficha,
    rol: stored.usuario.rol.toLowerCase(),
    jti: randomUUID(),
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as SignOptions);

  // Rotación: eliminar token anterior y emitir uno nuevo
  const newRefreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);

  const expiresAt = new Date(Date.now() + parseDuration(env.jwt.refreshExpiresIn));

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: { token: newRefreshToken, usuarioId: stored.usuario.id, expiresAt },
    }),
  ]);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string, ctx?: AccessContext) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    select: { usuario: { select: { id: true, ficha: true } } },
  });
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  if (stored) {
    await recordAccess({ evento: 'LOGOUT', ficha: stored.usuario.ficha, usuarioId: stored.usuario.id }, ctx);
  }
}
