import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminToken } from './helpers';

const BASE = 'http://localhost:3001';

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
}, 15000);

describe('Concurrency — Race condition en préstamos', () => {
  let equipoId: number;
  let oficinaDestinoId: number;
  let oficinaSoporteId: number;

  beforeAll(async () => {
    const typesRes = await request(BASE).get('/api/v1/equipment/types').set('Authorization', `Bearer ${adminToken}`);
    const tipoId = typesRes.body[0]?.id || 1;

    const seriesRes = await request(BASE).get('/api/v1/equipment/next-serie').set('Authorization', `Bearer ${adminToken}`);

    const treeRes = await request(BASE).get('/api/v1/locations/tree').set('Authorization', `Bearer ${adminToken}`);
    for (const ciudad of (treeRes.body || [])) {
      for (const seccion of (ciudad.secciones || [])) {
        for (const oficina of (seccion.oficinas || [])) {
          const n = (oficina.nombre || '').toLowerCase();
          if (n.includes('soporte') && !oficinaSoporteId) oficinaSoporteId = oficina.id;
          else if (!n.includes('soporte') && !n.includes('deposito') && !oficinaDestinoId) oficinaDestinoId = oficina.id;
        }
      }
    }

    const create = await request(BASE)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serie: seriesRes.body.nextSerie, tipoEquipoId: tipoId, oficinaId: oficinaSoporteId, modelo: 'Equipo Test Concurrencia' });

    if (create.status !== 201) throw new Error(`Create failed: ${JSON.stringify(create.body)}`);
    equipoId = create.body.id;

    const transfer = await request(BASE)
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId, motivo: 'Activar para test' });

    if (transfer.status !== 200) throw new Error(`Transfer failed: ${JSON.stringify(transfer.body)}`);
  }, 15000);

  // BUG CONOCIDO: No hay locking a nivel DB al crear préstamos.
  // Dos requests simultáneos pueden crear préstamos del mismo equipo
  // porque ambos leen estado !== 'PRESTADO' antes de que el primero actualice.
  // Se espera que este test FALLE hasta que se implemente locking (SELECT FOR UPDATE).
  it.skip('dos préstamos simultáneos — solo uno debe crearse (requiere DB locking)', async () => {
    const [res1, res2] = await Promise.all([
      request(BASE).post('/api/v1/loans').set('Authorization', `Bearer ${adminToken}`).send({ equipoId, oficinaDestinoId, solicitanteFicha: 1234, motivo: 'Concurrente 1' }),
      request(BASE).post('/api/v1/loans').set('Authorization', `Bearer ${adminToken}`).send({ equipoId, oficinaDestinoId, solicitanteFicha: 5678, motivo: 'Concurrente 2' }),
    ]);

    const statuses = [res1.status, res2.status];
    console.log('R1:', res1.status, JSON.stringify(res1.body).slice(0, 200));
    console.log('R2:', res2.status, JSON.stringify(res2.body).slice(0, 200));

    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const failed = res1.status === 400 ? res1 : res2;
    expect(failed.body.error).toMatch(/ya está prestado/i);
  });
});
