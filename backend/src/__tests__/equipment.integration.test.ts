import { describe, it, expect, beforeAll } from 'vitest';
import { api, getAdminToken, getTecnicoToken } from './helpers.js';

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
}, 15000);

describe('Equipment Integration — Flujo completo', () => {
  let equipoId: number;
  let oficinaSoporteId: number;
  let oficinaMantenimientoId: number;
  let oficinaDestinoId: number;
  let servicioId: number;

  beforeAll(async () => {
    const treeRes = await api
      .get('/api/v1/locations/tree')
      .set('Authorization', `Bearer ${adminToken}`);

    if (!Array.isArray(treeRes.body)) {
      throw new Error(`Tree not an array: ${JSON.stringify(treeRes.body).slice(0, 200)}`);
    }

    for (const ciudad of treeRes.body) {
      for (const seccion of (ciudad.secciones || [])) {
        for (const oficina of (seccion.oficinas || [])) {
          if (oficina.tipo === 'SOPORTE' && !oficinaSoporteId) oficinaSoporteId = oficina.id;
          else if (oficina.tipo === 'MANTENIMIENTO' && !oficinaMantenimientoId) oficinaMantenimientoId = oficina.id;
          else if (oficina.tipo === 'OFICINA' && !oficinaDestinoId) oficinaDestinoId = oficina.id;
        }
      }
    }

    const providersRes = await api
      .get('/api/v1/service-providers')
      .set('Authorization', `Bearer ${adminToken}`);

    if (providersRes.body.data?.length > 0) {
      servicioId = providersRes.body.data[0].id;
    } else {
      const newProvider = await api
        .post('/api/v1/service-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'IT Service Test', contacto: 'test@test.com' });
      servicioId = newProvider.body.id;
    }
  }, 15000);

  it('Paso 1 — Crea equipo en Mantenimiento con oficina asignada', async () => {
    const typesRes = await api.get('/api/v1/equipment/types').set('Authorization', `Bearer ${adminToken}`);
    const tipoId = typesRes.body[0]?.id;

    const seriesRes = await api.get('/api/v1/equipment/next-serie').set('Authorization', `Bearer ${adminToken}`);
    const serie = seriesRes.body.nextSerie + Math.floor(Math.random() * 1000);

    const res = await api
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serie, tipoEquipoId: tipoId, oficinaId: oficinaDestinoId, modelo: 'Equipo Test Integración', ip: '192.168.1.99' });

    if (res.status !== 201) {
      console.log('Paso1 body:', JSON.stringify(res.body).slice(0, 400));
      console.log('series:', serie, 'tipoId:', tipoId, 'destinoId:', oficinaDestinoId);
    }
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('NUEVO');
    expect(res.body.oficina.id).toBe(oficinaMantenimientoId);
    expect(res.body.oficinaAsignada.id).toBe(oficinaDestinoId);
    equipoId = res.body.id;
  });

  it('Paso 2 — Cambia la oficina asignada mientras está adentro', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId: oficinaSoporteId, motivo: 'Reasignación inicial' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('NUEVO');
    expect(res.body.oficina.id).toBe(oficinaMantenimientoId);
    expect(res.body.oficinaAsignada.id).toBe(oficinaSoporteId);
  });

  it('Paso 3 — Da SALIDA únicamente a la oficina asignada', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/exit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Equipo pronto' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
    expect(res.body.oficina.id).toBe(oficinaSoporteId);
  });

  it('Paso 3b — Un equipo en Informática - Soporte aparece al filtrar Activos', async () => {
    const res = await api
      .get('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ estado: 'ACTIVO', oficinaId: oficinaSoporteId, limit: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.some((equipo: { id: number }) => equipo.id === equipoId)).toBe(true);
  });

  it('Paso 4 — Registra ENTRADA temporal a Mantenimiento', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-support`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Revisión preventiva' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_REPARACION');
    expect(res.body.oficina.id).toBe(oficinaMantenimientoId);
    expect(res.body.oficinaAsignada.id).toBe(oficinaSoporteId);
  });

  it('Paso 4b — La jerarquía conserva la oficina dueña y muestra quién está adentro', async () => {
    const [asignados, enMantenimiento] = await Promise.all([
      api
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ oficinaId: oficinaSoporteId, limit: 100 }),
      api
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ oficinaId: oficinaMantenimientoId, limit: 100 }),
    ]);

    expect(asignados.body.data.some((equipo: { id: number }) => equipo.id === equipoId)).toBe(true);
    expect(enMantenimiento.body.data.some((equipo: { id: number }) => equipo.id === equipoId)).toBe(true);
  });

  it('Paso 5 — Historial conserva creación, cambio, salida y entrada', async () => {
    const res = await api
      .get('/api/v1/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ equipoId });

    const acciones = res.body.data.map((h: any) => h.accion);
    expect(acciones).toContain('CREACION');
    expect(acciones).toContain('TRANSFERENCIA');
    expect(acciones).toContain('ASIGNACION');
    expect(acciones).toContain('ENVIO_SOPORTE');
  });

  it('Paso 6 — Envía a servicio externo desde Mantenimiento', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-service`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ servicioId, motivo: 'Falla en fuente' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_SERVICIO_EXTERNO');
  });

  it('Paso 7 — Retorna del servicio a Mantenimiento', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/return-from-service`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Reparado', diagnostico: 'Fuente reemplazada' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_REPARACION');
  });

  it('Paso 8 — Da SALIDA nuevamente a Informática - Soporte', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/exit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Retorno completado' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
    expect(res.body.oficina.id).toBe(oficinaSoporteId);
  });

  it('Paso 9 — Historial completo', async () => {
    const res = await api
      .get(`/api/v1/history/equipment/${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const acciones = (res.body as any[]).map((h: any) => h.accion);
    expect(acciones).toContain('CREACION');
    expect(acciones).toContain('ASIGNACION');
    expect(acciones).toContain('ENVIO_SERVICIO_EXTERNO');
    expect(acciones).toContain('RETORNO_SERVICIO_EXTERNO');
    expect(acciones).toContain('RETORNO_SOPORTE');
  });

  it('Paso 10 — TECNICO no puede mutar plantillas (403)', async () => {
    const tecnicoToken = await getTecnicoToken();
    const res = await api
      .post('/api/v1/model-templates')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ nombre: 'Hack', tipoEquipoId: 1 });

    expect(res.status).toBe(403);
  });
});
