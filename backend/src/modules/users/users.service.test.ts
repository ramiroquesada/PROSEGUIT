import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

import { createUser, resetPassword, changePassword } from './users.service.js';
import { prisma } from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';

const mockPrisma = prisma as unknown as {
  usuario: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockBcrypt = bcrypt as unknown as { compare: ReturnType<typeof vi.fn>; hash: ReturnType<typeof vi.fn> };

// ─── createUser ───────────────────────────────────────────────────────────────

describe('createUser', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('retorna el usuario creado con tempPassword incluido', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null); // ficha no existe
    mockPrisma.usuario.create.mockResolvedValue({
      id: 1, nombre: 'Juan Pérez', ficha: 5678, email: null, rol: 'TECNICO', activo: true,
    });

    const result = await createUser({ nombre: 'Juan Pérez', ficha: 5678, rol: 'TECNICO' });

    expect(result).toHaveProperty('tempPassword');
    expect(typeof result.tempPassword).toBe('string');
    expect(result.tempPassword).toHaveLength(8); // 4 bytes = 8 hex chars
  });

  it('genera contraseñas únicas en cada llamada', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 1, nombre: 'A', ficha: 1, email: null, rol: 'TECNICO', activo: true,
    });

    const r1 = await createUser({ nombre: 'A', ficha: 1, rol: 'TECNICO' });

    mockPrisma.usuario.create.mockResolvedValue({
      id: 2, nombre: 'B', ficha: 2, email: null, rol: 'TECNICO', activo: true,
    });
    const r2 = await createUser({ nombre: 'B', ficha: 2, rol: 'TECNICO' });

    // En teoría podrían colisionar (1 en 2^32), pero en tests es prácticamente imposible
    expect(r1.tempPassword).not.toBe(r2.tempPassword);
  });

  it('hashea la contraseña antes de guardar (nunca guarda en texto plano)', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 1, nombre: 'Test', ficha: 100, email: null, rol: 'TECNICO', activo: true,
    });

    const result = await createUser({ nombre: 'Test', ficha: 100, rol: 'TECNICO' });

    expect(mockBcrypt.hash).toHaveBeenCalledOnce();
    const [plaintext, rounds] = mockBcrypt.hash.mock.calls[0];
    expect(plaintext).toBe(result.tempPassword); // el plain que se hashea es el que se retorna
    expect(rounds).toBe(12);
  });

  it('lanza 409 si la ficha ya existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 5, ficha: 5678 });

    await expect(createUser({ nombre: 'Duplicado', ficha: 5678, rol: 'TECNICO' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('crea el usuario con forcePasswordChange = true', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);
    mockPrisma.usuario.create.mockResolvedValue({
      id: 1, nombre: 'Test', ficha: 200, email: null, rol: 'TECNICO', activo: true,
    });

    await createUser({ nombre: 'Test', ficha: 200, rol: 'TECNICO' });

    expect(mockPrisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forcePasswordChange: true }),
      }),
    );
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('retorna la nueva tempPassword generada', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 1, ficha: 1234 });
    mockPrisma.usuario.update.mockResolvedValue({});

    const result = await resetPassword(1);

    expect(result).toHaveProperty('tempPassword');
    expect(result.tempPassword).toHaveLength(8);
  });

  it('actualiza forcePasswordChange a true', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 1, ficha: 1234 });
    mockPrisma.usuario.update.mockResolvedValue({});

    await resetPassword(1);

    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forcePasswordChange: true }),
      }),
    );
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(resetPassword(999))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe('changePassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const existingUser = { id: 1, ficha: 1234, passwordHash: 'old-hash' };

  it('actualiza el hash y pone forcePasswordChange = false', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(existingUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockPrisma.usuario.update.mockResolvedValue({});

    await changePassword(1, { currentPassword: 'old-pass', newPassword: 'new-pass-123' });

    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forcePasswordChange: false }),
      }),
    );
  });

  it('lanza 401 si la contraseña actual es incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(existingUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(changePassword(1, { currentPassword: 'wrong', newPassword: 'new-pass-123' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(changePassword(999, { currentPassword: 'pass', newPassword: 'new' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
