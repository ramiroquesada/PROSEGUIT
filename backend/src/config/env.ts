import dotenv from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

const durationSchema = z.string().regex(/^\d+[smhd]$/, 'debe usar un formato como 15m o 7d');

const rawEnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'es obligatoria').refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'debe ser una URL de PostgreSQL'
  ),
  JWT_SECRET: z.string().min(16, 'debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: durationSchema.default('15m'),
  JWT_REFRESH_EXPIRES_IN: durationSchema.default('7d'),
}).superRefine((values, context) => {
  if (values.NODE_ENV !== 'production') return;

  const placeholderPattern = /cambiar|placeholder|admin123/i;

  if (values.JWT_SECRET.length < 32 || placeholderPattern.test(values.JWT_SECRET)) {
    context.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'debe ser un secreto productivo aleatorio de al menos 32 caracteres',
    });
  }

  if (values.JWT_REFRESH_SECRET.length < 32 || placeholderPattern.test(values.JWT_REFRESH_SECRET)) {
    context.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message: 'debe ser un secreto productivo aleatorio de al menos 32 caracteres',
    });
  }

  if (values.JWT_SECRET === values.JWT_REFRESH_SECRET) {
    context.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message: 'debe ser diferente de JWT_SECRET',
    });
  }
});

export function parseEnv(source: NodeJS.ProcessEnv) {
  const result = rawEnvSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'entorno'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida: ${details}`);
  }

  return {
    port: result.data.PORT,
    nodeEnv: result.data.NODE_ENV,
    database: {
      url: result.data.DATABASE_URL,
    },
    jwt: {
      secret: result.data.JWT_SECRET,
      refreshSecret: result.data.JWT_REFRESH_SECRET,
      expiresIn: result.data.JWT_EXPIRES_IN,
      refreshExpiresIn: result.data.JWT_REFRESH_EXPIRES_IN,
    },
  } as const;
}

export const env = parseEnv(process.env);
