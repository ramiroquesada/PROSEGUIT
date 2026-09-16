import { describe, expect, it, vi } from 'vitest';
import multer from 'multer';
import type { Request, Response } from 'express';
import { AppError, errorHandler } from './error-handler.js';

function run(err: Error) {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  errorHandler(err, { requestId: 'test' } as Request, res as unknown as Response, vi.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe('errorHandler', () => {
  // Antes una foto de más del límite devolvía 500 "Error interno del servidor"
  it('answers 413 with a clear message when the upload is too large', () => {
    const { status, body } = run(new multer.MulterError('LIMIT_FILE_SIZE', 'image'));
    expect(status).toBe(413);
    expect(body.error).toMatch(/demasiado grande/);
  });

  it('answers 400 for other upload errors', () => {
    const { status } = run(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'otro'));
    expect(status).toBe(400);
  });

  it('keeps the status of an AppError, as the image fileFilter uses', () => {
    const { status, body } = run(new AppError(400, 'Formato no soportado'));
    expect(status).toBe(400);
    expect(body.error).toBe('Formato no soportado');
  });
});
