import { describe, it, expect, beforeAll } from 'vitest';
import { api, getAdminToken } from './helpers.js';

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
}, 15000);

describe('Concurrency — Race condition en préstamos', () => {
  let equipoId: number;
  let oficinaDestinoId: number;
  let oficinaSoporteId: number;

  beforeAll(async () => {
    const typesRes = await api.get('/api/v1/equipment/types').set('Authorization', `Bearer ${adminToken}`);
    const tipoId = typesRes.body[0]?.id || 1;

    const seriesRes = await api.get('/api/v1/equipment/next-serie').set('Authorization', `Bearer ${adminToken}`);

    const treeRes = await api.get('/api/v1/locations/tree').set('Authorization', `Bearer ${adminToken}`);
    for (const ciudad of (treeRes.body || [])) {
      for (const seccion of (ciudad.secciones || [])) {
        for (const oficina of (seccion.oficinas || [])) {
          if (oficina.tipo === 'SOPORTE' && !oficinaSoporteId) oficinaSoporteId = oficina.id;
          else if (oficina.tipo === 'OFICINA' && !oficinaDestinoId) oficinaDestinoId = oficina.id;
        }
      }
    }

    const create = await api
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serie: seriesRes.body.nextSerie, tipoEquipoId: tipoId, oficinaId: oficinaSoporteId, modelo: 'Equipo Test Concurrencia' });

    if (create.status !== 201) throw new Error(`Create failed: ${JSON.stringify(create.body)}`);
    equipoId = create.body.id;

    const exit = await api
      .post(`/api/v1/equipment/${equipoId}/exit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Activar para test' });

    if (exit.status !== 200) throw new Error(`Exit failed: ${JSON.stringify(exit.body)}`);
  }, 15000);

  it('dos préstamos simultáneos — solo uno debe crearse', async () => {
    const [res1, res2] = await Promise.all([
      api.post('/api/v1/loans').set('Authorization', `Bearer ${adminToken}`).send({ equipoId, oficinaDestinoId, solicitanteFicha: 1234, motivo: 'Concurrente 1' }),
      api.post('/api/v1/loans').set('Authorization', `Bearer ${adminToken}`).send({ equipoId, oficinaDestinoId, solicitanteFicha: 5678, motivo: 'Concurrente 2' }),
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
