import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminToken } from './helpers';

const BASE = 'http://localhost:3001';

let token: string;

beforeAll(async () => {
  token = await getAdminToken();
}, 15000);

describe('Validation — Zod middleware', () => {
  describe('POST /equipment', () => {
    it('rechaza serie = 0', async () => {
      const res = await request(BASE).post('/api/v1/equipment').set('Authorization', `Bearer ${token}`).send({ serie: 0, tipoEquipoId: 1, oficinaId: 1 });
      expect(res.status).toBe(400);
    });
    it('rechaza sin tipoEquipoId', async () => {
      const res = await request(BASE).post('/api/v1/equipment').set('Authorization', `Bearer ${token}`).send({ serie: 99991, oficinaId: 1 });
      expect(res.status).toBe(400);
    });
    it('rechaza sin oficinaId', async () => {
      const res = await request(BASE).post('/api/v1/equipment').set('Authorization', `Bearer ${token}`).send({ serie: 99992, tipoEquipoId: 1 });
      expect(res.status).toBe(400);
    });
    it('rechaza serie negativa', async () => {
      const res = await request(BASE).post('/api/v1/equipment').set('Authorization', `Bearer ${token}`).send({ serie: -1, tipoEquipoId: 1, oficinaId: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /equipment/:id/transfer', () => {
    it('rechaza sin motivo', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/transfer').set('Authorization', `Bearer ${token}`).send({ oficinaDestinoId: 1 });
      expect(res.status).toBe(400);
    });
    it('rechaza sin oficinaDestinoId', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/transfer').set('Authorization', `Bearer ${token}`).send({ motivo: 'test' });
      expect(res.status).toBe(400);
    });
    it('rechaza oficinaDestinoId = 0', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/transfer').set('Authorization', `Bearer ${token}`).send({ oficinaDestinoId: 0, motivo: 'test' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /equipment/:id/send-to-service', () => {
    it('rechaza servicioId = 0', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/send-to-service').set('Authorization', `Bearer ${token}`).send({ servicioId: 0, motivo: 'test' });
      expect(res.status).toBe(400);
    });
    it('rechaza sin motivo', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/send-to-service').set('Authorization', `Bearer ${token}`).send({ servicioId: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /equipment/:id/send-to-support', () => {
    it('rechaza sin motivo', async () => {
      const res = await request(BASE).post('/api/v1/equipment/1/send-to-support').set('Authorization', `Bearer ${token}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('rechaza sin ficha', async () => {
      const res = await request(BASE).post('/api/v1/auth/login').send({ password: 'test' });
      expect(res.status).toBe(400);
    });
    it('rechaza sin password', async () => {
      const res = await request(BASE).post('/api/v1/auth/login').send({ ficha: 9999 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /users', () => {
    it('rechaza sin nombre', async () => {
      const res = await request(BASE).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send({ ficha: 99991, rol: 'TECNICO' });
      expect(res.status).toBe(400);
    });
    it('rechaza rol inválido', async () => {
      const res = await request(BASE).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send({ nombre: 'Test', ficha: 99992, rol: 'HACKER' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /users/change-password', () => {
    it('rechaza contraseña corta (< 6)', async () => {
      const res = await request(BASE).post('/api/v1/users/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'admin123', newPassword: 'abc' });
      expect(res.status).toBe(400);
    });
  });
});
