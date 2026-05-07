import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { getAdminToken, getTecnicoToken } from './helpers';

const BASE = 'http://localhost:3001';

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
}, 15000);

describe('Equipment Integration — Flujo completo', () => {
  let equipoId: number;
  let oficinaSoporteId: number;
  let oficinaDestinoId: number;
  let servicioId: number;

  beforeAll(async () => {
    const treeRes = await request(BASE)
      .get('/api/v1/locations/tree')
      .set('Authorization', `Bearer ${adminToken}`);

    if (!Array.isArray(treeRes.body)) {
      throw new Error(`Tree not an array: ${JSON.stringify(treeRes.body).slice(0, 200)}`);
    }

    for (const ciudad of treeRes.body) {
      for (const seccion of (ciudad.secciones || [])) {
        for (const oficina of (seccion.oficinas || [])) {
          const nombre = (oficina.nombre || '').toLowerCase();
          if (nombre.includes('soporte') && !oficinaSoporteId) oficinaSoporteId = oficina.id;
          else if (!nombre.includes('soporte') && !nombre.includes('deposito') && !oficinaDestinoId) oficinaDestinoId = oficina.id;
        }
      }
    }

    const providersRes = await request(BASE)
      .get('/api/v1/service-providers')
      .set('Authorization', `Bearer ${adminToken}`);

    if (providersRes.body.data?.length > 0) {
      servicioId = providersRes.body.data[0].id;
    } else {
      const newProvider = await request(BASE)
        .post('/api/v1/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'IT Service Test', contacto: 'test@test.com' });
      servicioId = newProvider.body.id;
    }
  }, 15000);

  it('Paso 1 — Crea equipo (estado NUEVO en soporte)', async () => {
    const typesRes = await request(BASE).get('/api/v1/equipment/types').set('Authorization', `Bearer ${adminToken}`);
    const tipoId = typesRes.body[0]?.id;

    const seriesRes = await request(BASE).get('/api/v1/equipment/next-serie').set('Authorization', `Bearer ${adminToken}`);
    const serie = seriesRes.body.nextSerie + Math.floor(Math.random() * 1000);

    const res = await request(BASE)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serie, tipoEquipoId: tipoId, oficinaId: oficinaSoporteId, modelo: 'Equipo Test Integración', ip: '192.168.1.99' });

    if (res.status !== 201) {
      console.log('Paso1 body:', JSON.stringify(res.body).slice(0, 400));
      console.log('series:', serie, 'tipoId:', tipoId, 'soporteId:', oficinaSoporteId);
    }
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('NUEVO');
    equipoId = res.body.id;
  });

  it('Paso 2 — Transfiere (NUEVO → ACTIVO)', async () => {
    const res = await request(BASE)
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId, motivo: 'Asignación inicial' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('Paso 3 — Historial: CREACION + ASIGNACION', async () => {
    const res = await request(BASE)
      .get('/api/v1/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ equipoId });

    const acciones = res.body.data.map((h: any) => h.accion);
    expect(acciones).toContain('CREACION');
    expect(acciones).toContain('ASIGNACION');
  });

  it('Paso 4 — Envía a servicio externo', async () => {
    const res = await request(BASE)
      .post(`/api/v1/equipment/${equipoId}/send-to-service`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ servicioId, motivo: 'Falla en fuente' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_SERVICIO_EXTERNO');
  });

  it('Paso 5 — Retorna de servicio externo', async () => {
    const res = await request(BASE)
      .post(`/api/v1/equipment/${equipoId}/return-from-service`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Reparado', diagnostico: 'Fuente reemplazada' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('Paso 6 — Historial completo: 4 acciones', async () => {
    const res = await request(BASE)
      .get(`/api/v1/history/equipment/${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const acciones = (res.body as any[]).map((h: any) => h.accion);
    expect(acciones).toContain('CREACION');
    expect(acciones).toContain('ASIGNACION');
    expect(acciones).toContain('ENVIO_SERVICIO_EXTERNO');
    expect(acciones).toContain('RETORNO_SERVICIO_EXTERNO');
  });

  it('Paso 7 — TECNICO no puede mutar plantillas (403)', async () => {
    const tecnicoToken = await getTecnicoToken();
    const res = await request(BASE)
      .post('/api/v1/model-templates')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ nombre: 'Hack', tipoEquipoId: 1 });

    expect(res.status).toBe(403);
  });
});
