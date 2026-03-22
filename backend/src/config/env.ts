import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
} as const;
