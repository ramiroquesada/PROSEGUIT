import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { recordAccess, type AccessContext } from '../access-log/access-log.service.js';

function generateTempPassword(): string {
  return randomBytes(4).toString('hex'); // 8 chars hex aleatorios
}

export async function listUsers() {
  return prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      ficha: true,
      email: true,
      rol: true,
      activo: true,
      forcePasswordChange: true,
      oficina: { select: { id: true, nombre: true } },
      ultimoAcceso: true,
      createdAt: true,
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function getUserById(id: number) {
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      ficha: true,
      email: true,
      rol: true,
      activo: true,
      forcePasswordChange: true,
      oficina: { select: { id: true, nombre: true } },
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
}

export async function createUser(data: {
  nombre: string;
  ficha: number;
  email?: string;
  rol: 'ADMIN' | 'TECNICO';
  oficinaId?: number;
}) {
  const existing = await prisma.usuario.findUnique({ where: { ficha: data.ficha } });
  if (existing) throw new AppError(409, 'Ya existe un usuario con esa ficha');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.usuario.create({
    data: {
      nombre: data.nombre,
      ficha: data.ficha,
      email: data.email,
      passwordHash,
      rol: data.rol,
      oficinaId: data.oficinaId,
      forcePasswordChange: true,
    },
    select: {
      id: true,
      nombre: true,
      ficha: true,
      email: true,
      rol: true,
      activo: true,
    },
  });

  return { ...user, tempPassword };
}

export async function updateUser(id: number, data: {
  nombre?: string;
  email?: string;
  rol?: 'ADMIN' | 'TECNICO';
  activo?: boolean;
  oficinaId?: number;
}) {
  const existing = await prisma.usuario.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Usuario no encontrado');

  return prisma.usuario.update({
    where: { id },
    data,
    select: {
      id: true,
      nombre: true,
      ficha: true,
      email: true,
      rol: true,
      activo: true,
    },
  });
}

export async function resetPassword(id: number, actorId?: number, ctx?: AccessContext) {
  const user = await prisma.usuario.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.usuario.update({
    where: { id },
    data: { passwordHash, forcePasswordChange: true },
  });
  await recordAccess({ evento: 'RESET_PASSWORD', ficha: user.ficha, usuarioId: id, actorId }, ctx);

  return { tempPassword };
}

export async function changePassword(userId: number, data: {
  currentPassword: string;
  newPassword: string;
}, ctx?: AccessContext) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'Contraseña actual incorrecta');

  const passwordHash = await bcrypt.hash(data.newPassword, 12);

  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash, forcePasswordChange: false },
  });
  await recordAccess({ evento: 'CAMBIO_PASSWORD', ficha: user.ficha, usuarioId: userId }, ctx);
}

// Invalida los refresh tokens: el usuario queda afuera cuando vence su access token (15 min máx.)
export async function revokeSessions(id: number, actorId: number, ctx?: AccessContext) {
  const user = await prisma.usuario.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');

  const { count } = await prisma.refreshToken.deleteMany({ where: { usuarioId: id } });
  await recordAccess({ evento: 'SESIONES_CERRADAS', ficha: user.ficha, usuarioId: id, actorId }, ctx);
  return { count };
}
