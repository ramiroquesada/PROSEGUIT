import { describe, it, expect, vi } from 'vitest';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../config/env.js', () => ({
  env: {
    jwt: { secret: 'test-secret', refreshSecret: 'test-refresh', expiresIn: '15m', refreshExpiresIn: '7d' },
  },
}));

import { adminOnly, authMiddleware } from './auth.js';
import { AppError } from './error-handler.js';
import type { Request, Response } from 'express';

function mockReq(rol?: string): Request {
  return {
    user: rol ? { userId: 1, ficha: 1234, rol } : undefined,
    headers: {},
  } as unknown as Request;
}

function mockRes(): Response {
  return { status: vi.fn(), json: vi.fn() } as unknown as Response;
}

describe('adminOnly', () => {
  it('permite pasar si el rol es "admin"', () => {
    const req = mockReq('admin');
    const next = vi.fn();
    adminOnly(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('lanza 403 si no hay user en el request', () => {
    const req = mockReq(undefined);
    const next = vi.fn();
    expect(() => adminOnly(req, mockRes(), next)).toThrow(AppError);
  });

  it('lanza 403 si el rol no es admin', () => {
    const req = mockReq('TECNICO');
    const next = vi.fn();
    expect(() => adminOnly(req, mockRes(), next)).toThrow(AppError);
  });

  it('lanza 403 si el rol es TECNICO', () => {
    const req = mockReq('TECNICO');
    const next = vi.fn();
    expect(() => adminOnly(req, mockRes(), next)).toThrow(AppError);
  });
});
