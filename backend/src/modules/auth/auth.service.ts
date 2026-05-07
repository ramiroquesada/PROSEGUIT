import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { JwtPayload } from '../../middleware/auth.js';

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

export async function login(ficha: number, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { ficha } });

  if (!usuario || !usuario.activo) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  const validPassword = await bcrypt.compare(password, usuario.passwordHash);
  if (!validPassword) {
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

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}
