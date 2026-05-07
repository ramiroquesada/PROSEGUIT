import type { Request, Response, NextFunction } from 'express';
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

  logger.error({ err, requestId: req.requestId }, err.message);

  res.status(500).json({
    error: env.nodeEnv === 'production'
      ? 'Error interno del servidor'
      : err.message,
    ...(env.nodeEnv !== 'production' && { requestId: req.requestId }),
  });
}
