import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validate(schema: { safeParse: (data: unknown) => any }, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const messages = result.error.issues.map((i: { path: unknown[]; message: string }) =>
        `${i.path.join('.')}: ${i.message}`
      );
      throw new AppError(400, messages.join('; '));
    }

    req[source] = result.data;
    next();
  };
}
