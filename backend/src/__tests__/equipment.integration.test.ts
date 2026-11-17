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
  let oficinaStockId: number;
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
          else if (oficina.tipo === 'STOCK' && !oficinaStockId) oficinaStockId = oficina.id;
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

  it('Paso 1 — Crea el equipo en Stock, NUEVO y listo, sin pedir oficina', async () => {
    const typesRes = await api.get('/api/v1/equipment/types').set('Authorization', `Bearer ${adminToken}`);
    const tipoId = typesRes.body[0]?.id;

    const seriesRes = await api.get('/api/v1/equipment/next-serie').set('Authorization', `Bearer ${adminToken}`);
    const serie = seriesRes.body.nextSerie + Math.floor(Math.random() * 1000);

    const res = await api
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serie, tipoEquipoId: tipoId, modelo: 'Equipo Test Integración', ip: '192.168.1.99' });

    if (res.status !== 201) {
      console.log('Paso1 body:', JSON.stringify(res.body).slice(0, 400));
      console.log('series:', serie, 'tipoId:', tipoId, 'stockId:', oficinaStockId);
    }
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('NUEVO');
    expect(res.body.oficina.id).toBe(oficinaStockId);
    expect(res.body.oficinaAsignada.id).toBe(oficinaStockId);
    expect(res.body.stockEtapa).toBe('LISTO');
    equipoId = res.body.id;
  });

  it('Paso 1b — Abre el detalle del equipo en una base migrada desde cero', async () => {
    const res = await api
      .get(`/api/v1/equipment/${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(equipoId);
    expect(res.body.imagenes).toEqual([]);
    expect(res.body.oficina.id).toBe(oficinaStockId);
  });

  it('Paso 1c — Consulta las licencias en una base migrada desde cero', async () => {
    const res = await api
      .get('/api/v1/licenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ equipoId, page: 1, limit: 25 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('Paso 1d — El equipo nuevo figura en el stock', async () => {
    const res = await api
      .get('/api/v1/equipment/stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const item = res.body.find((e: { id: number }) => e.id === equipoId);
    expect(item).toBeDefined();
    expect(item.stockEtapa).toBe('LISTO');
    expect(item.stockDesde).toBeTruthy();
  });

  it('Paso 2 — Asigna desde Stock: sale físicamente a la oficina destino', async () => {
    const res = await api
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId: oficinaSoporteId, motivo: 'Asignación inicial' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ACTIVO');
    expect(res.body.oficina.id).toBe(oficinaSoporteId);
    expect(res.body.oficinaAsignada.id).toBe(oficinaSoporteId);
    expect(res.body.stockEtapa).toBeNull();
  });

  it('Paso 2b — Al asignarse deja de figurar en el stock', async () => {
    const res = await api
      .get('/api/v1/equipment/stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.some((e: { id: number }) => e.id === equipoId)).toBe(false);
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

  it('Paso 8b — Vuelve a Mantenimiento y pasa a Stock como disponible a revisar', async () => {
    const entrada = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-support`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Retirado de la oficina' });
    expect(entrada.status).toBe(200);

    const reasignar = await api
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId: oficinaStockId, motivo: 'Queda disponible' });
    expect(reasignar.status).toBe(200);

    const salida = await api
      .post(`/api/v1/equipment/${equipoId}/exit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'A stock' });

    expect(salida.status).toBe(200);
    expect(salida.body.estado).toBe('DISPONIBLE');
    expect(salida.body.oficina.id).toBe(oficinaStockId);

    const detalle = await api
      .get(`/api/v1/equipment/${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detalle.body.stockEtapa).toBe('A_REVISAR');
  });

  it('Paso 8c — Se marca como listo y aparece en el filtro Disponible', async () => {
    const res = await api
      .patch(`/api/v1/equipment/${equipoId}/stock-stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etapa: 'LISTO' });
    expect(res.status).toBe(200);
    expect(res.body.stockEtapa).toBe('LISTO');

    const list = await api
      .get('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ estado: 'DISPONIBLE', limit: 100 });
    expect(list.body.data.some((e: { id: number }) => e.id === equipoId)).toBe(true);
  });

  it('Paso 8d — Pase directo a Stock desde una oficina, con condición', async () => {
    const asignar = await api
      .post(`/api/v1/equipment/${equipoId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oficinaDestinoId, motivo: 'Entrega' });
    expect(asignar.status).toBe(200);
    expect(asignar.body.estado).toBe('ACTIVO');

    const pase = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Reemplazado por uno nuevo', condicion: 'CON_DETALLES' });
    expect(pase.status).toBe(200);
    expect(pase.body).toMatchObject({
      estado: 'DISPONIBLE', stockEtapa: 'A_REVISAR', condicion: 'CON_DETALLES',
    });
    expect(pase.body.oficina.id).toBe(oficinaStockId);
    expect(pase.body.oficinaAsignada.id).toBe(oficinaStockId);

    const stock = await api
      .get('/api/v1/equipment/stock')
      .set('Authorization', `Bearer ${adminToken}`);
    const item = (stock.body as { id: number; condicion: string }[]).find((e) => e.id === equipoId);
    expect(item?.condicion).toBe('CON_DETALLES');

    const repetido = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'Otra vez' });
    expect(repetido.status).toBe(400);

    const invalida = await api
      .post(`/api/v1/equipment/${equipoId}/send-to-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motivo: 'x', condicion: 'ROTO' });
    expect(invalida.status).toBe(400);
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
