import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

declare module 'express' {
  interface Request {
    requestId: string;
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info({
      requestId: id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms,
    }, `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });

  next();
}
