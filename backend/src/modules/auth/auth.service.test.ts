import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    registroAcceso: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-access-token'),
    verify: vi.fn(),
  },
}));

import { login, refreshAccessToken, logout } from './auth.service.js';
import { prisma } from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/error-handler.js';

const mockPrisma = prisma as unknown as {
  usuario: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  registroAcceso: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};
const mockBcrypt = bcrypt as unknown as { compare: ReturnType<typeof vi.fn>; hash: ReturnType<typeof vi.fn> };
const mockJwt = jwt as unknown as { sign: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };

const activeUser = {
  id: 1,
  nombre: 'Test User',
  ficha: 1234,
  rol: 'TECNICO',
  activo: true,
  passwordHash: 'hashed-password',
  forcePasswordChange: false,
};

// ─── login ───────────────────────────────────────────────────────────────────

function resetAccessLogMocks() {
  mockPrisma.registroAcceso.create.mockResolvedValue({});
  mockPrisma.registroAcceso.findFirst.mockResolvedValue(null);
  mockPrisma.registroAcceso.findMany.mockResolvedValue([]);
  mockPrisma.usuario.update.mockResolvedValue({});
}

function eventosRegistrados() {
  return mockPrisma.registroAcceso.create.mock.calls.map((c) => c[0].data.evento);
}

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJwt.sign.mockReset().mockReturnValue('mock-access-token');
    resetAccessLogMocks();
  });

  it('retorna accessToken, refreshToken y datos del usuario en login exitoso', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign
      .mockReturnValueOnce('access-token-123')
      .mockReturnValueOnce('refresh-token-123');
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await login(1234, 'password123');

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-123');
    expect(result.usuario.ficha).toBe(1234);
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('lanza 401 si el usuario no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(login(9999, 'password'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza 401 si el usuario está inactivo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...activeUser, activo: false });

    await expect(login(1234, 'password'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza 401 si la contraseña es incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(login(1234, 'wrong-password'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('no crea refreshToken si la contraseña es incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(login(1234, 'wrong')).rejects.toThrow(AppError);
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('incluye forcePasswordChange en la respuesta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...activeUser, forcePasswordChange: true });
    mockBcrypt.compare.mockResolvedValue(true);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await login(1234, 'password123');
    expect(result.usuario.forcePasswordChange).toBe(true);
  });

  it('registra LOGIN_OK con IP y navegador, y actualiza ultimoAcceso', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    await login(1234, 'password123', { ip: '10.0.0.5', userAgent: 'Firefox' });

    expect(mockPrisma.registroAcceso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ evento: 'LOGIN_OK', ficha: 1234, usuarioId: 1, ip: '10.0.0.5', userAgent: 'Firefox' }),
    });
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ultimoAcceso: expect.any(Date) },
    });
  });

  it('registra LOGIN_FALLIDO con contraseña incorrecta', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(login(1234, 'wrong')).rejects.toMatchObject({ statusCode: 401 });
    expect(eventosRegistrados()).toEqual(['LOGIN_FALLIDO']);
  });

  it('registra USUARIO_INEXISTENTE con la ficha ingresada', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(login(5555, 'x')).rejects.toMatchObject({ statusCode: 401 });
    expect(mockPrisma.registroAcceso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ evento: 'USUARIO_INEXISTENTE', ficha: 5555, usuarioId: null }),
    });
  });

  it('registra USUARIO_INACTIVO', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ ...activeUser, activo: false });

    await expect(login(1234, 'x')).rejects.toMatchObject({ statusCode: 401 });
    expect(eventosRegistrados()).toEqual(['USUARIO_INACTIVO']);
  });

  it('bloquea con 429 tras 5 fallos recientes, sin chequear la contraseña', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    const hace2min = new Date(Date.now() - 2 * 60_000);
    mockPrisma.registroAcceso.findMany.mockResolvedValue(Array(5).fill({ fecha: hace2min }));

    await expect(login(1234, 'password123')).rejects.toMatchObject({ statusCode: 429 });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(eventosRegistrados()).toEqual(['USUARIO_BLOQUEADO']);
  });

  it('no bloquea con menos de 5 fallos', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockPrisma.registroAcceso.findMany.mockResolvedValue(Array(4).fill({ fecha: new Date() }));
    mockBcrypt.compare.mockResolvedValue(true);
    mockPrisma.refreshToken.create.mockResolvedValue({});

    await expect(login(1234, 'password123')).resolves.toHaveProperty('accessToken');
  });

  it('el login funciona aunque falle guardar el registro de acceso', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(activeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.registroAcceso.create.mockRejectedValue(new Error('db down'));

    await expect(login(1234, 'password123')).resolves.toHaveProperty('accessToken');
  });
});

// ─── refreshAccessToken ──────────────────────────────────────────────────────

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJwt.sign.mockReset().mockReturnValue('mock-access-token');
  });

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const storedToken = {
    id: 10,
    token: 'old-refresh-token',
    expiresAt: futureDate,
    usuario: activeUser,
  };

  it('rota el refresh token: elimina el viejo y crea uno nuevo', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
    mockJwt.verify.mockReturnValue({});
    mockJwt.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token');
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await refreshAccessToken('old-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    // La transacción debe incluir un delete y un create
    const txArgs = mockPrisma.$transaction.mock.calls[0][0];
    expect(txArgs).toHaveLength(2);
  });

  it('lanza 401 si el token no existe en DB', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(refreshAccessToken('fake-token'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza 401 y elimina el token si está expirado', async () => {
    const pastDate = new Date(Date.now() - 1000);
    mockPrisma.refreshToken.findUnique.mockResolvedValue({ ...storedToken, expiresAt: pastDate });
    mockPrisma.refreshToken.delete.mockResolvedValue({});

    await expect(refreshAccessToken('expired-token'))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledOnce();
  });

  it('lanza 401 y elimina el token si jwt.verify falla', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
    mockJwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
    mockPrisma.refreshToken.delete.mockResolvedValue({});

    await expect(refreshAccessToken('tampered-token'))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledOnce();
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAccessLogMocks();
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
  });

  it('registra LOGOUT cuando el token pertenece a un usuario', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({ usuario: { id: 1, ficha: 1234 } });
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await logout('some-refresh-token');

    expect(eventosRegistrados()).toEqual(['LOGOUT']);
  });

  it('elimina el refreshToken de la DB', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await logout('some-refresh-token');

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'some-refresh-token' },
    });
  });

  it('no lanza error si el token no existía (deleteMany es idempotente)', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(logout('non-existent-token')).resolves.toBeUndefined();
  });
});
