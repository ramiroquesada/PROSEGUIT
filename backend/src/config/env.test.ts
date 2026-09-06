import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const validDevelopmentEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/proseguit',
  JWT_SECRET: 'development-secret-value',
  JWT_REFRESH_SECRET: 'development-refresh-secret-value',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('parseEnv', () => {
  it('normalizes a valid development configuration', () => {
    const parsed = parseEnv(validDevelopmentEnv);

    expect(parsed.port).toBe(3001);
    expect(parsed.nodeEnv).toBe('development');
    expect(parsed.database.url).toContain('postgresql://');
  });

  it('rejects a missing database URL without exposing secret values', () => {
    const { DATABASE_URL: _databaseUrl, ...incompleteEnv } = validDevelopmentEnv;

    expect(() => parseEnv(incompleteEnv)).toThrow('DATABASE_URL');
    expect(() => parseEnv(incompleteEnv)).not.toThrow(validDevelopmentEnv.JWT_SECRET);
  });

  it('rejects invalid ports and token durations', () => {
    expect(() => parseEnv({ ...validDevelopmentEnv, PORT: '70000' })).toThrow('PORT');
    expect(() => parseEnv({ ...validDevelopmentEnv, JWT_EXPIRES_IN: 'forever' })).toThrow(
      'JWT_EXPIRES_IN'
    );
  });

  it('rejects placeholders in production secrets', () => {
    expect(() => parseEnv({
      ...validDevelopmentEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'cambiar-esto-por-un-secreto-seguro',
      JWT_REFRESH_SECRET: 'cambiar-esto-por-otro-secreto-seguro',
    })).toThrow('secreto productivo aleatorio');
  });

  it('requires distinct production secrets', () => {
    const repeatedSecret = '0123456789abcdef0123456789abcdef';

    expect(() => parseEnv({
      ...validDevelopmentEnv,
      NODE_ENV: 'production',
      JWT_SECRET: repeatedSecret,
      JWT_REFRESH_SECRET: repeatedSecret,
    })).toThrow('debe ser diferente');
  });
});
