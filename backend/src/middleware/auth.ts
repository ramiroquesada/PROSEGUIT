import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error-handler.js';

export interface JwtPayload {
  userId: number;
  ficha: number;
  rol: string;
  jti: string;
}

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Token no proporcionado');
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError(401, 'Token inválido o expirado');
  }
}

export function adminOnly(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.rol !== 'admin') {
    throw new AppError(403, 'Acceso denegado: se requiere rol administrador');
  }
  next();
}
