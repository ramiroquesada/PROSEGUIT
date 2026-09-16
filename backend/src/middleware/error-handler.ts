import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Errores de subida (archivo muy grande, campo inesperado): son del cliente, no del servidor
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'La imagen es demasiado grande (máximo 10 MB)' : `Error al subir el archivo: ${err.message}`,
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, err.message);

  res.status(500).json({
    error: env.nodeEnv === 'production'
      ? 'Error interno del servidor'
      : err.message,
    ...(env.nodeEnv !== 'production' && { requestId: req.requestId }),
  });
}
