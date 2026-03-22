import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { JwtPayload } from '../../middleware/auth.js';

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
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);

  // Guardar refresh token en DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

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
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as SignOptions);

  return { accessToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}
