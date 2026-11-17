import { describe, it, expect, beforeAll } from 'vitest';
import { api, getAdminToken, getTecnicoToken } from './helpers.js';

let token: string;
let tecnicoToken: string;

beforeAll(async () => {
  token = await getAdminToken();
  tecnicoToken = await getTecnicoToken();
}, 15000);

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Insumos — catálogo y movimientos', () => {
  let categoriaId: number;
  let insumoId: number;
  let oficinaId: number;

  beforeAll(async () => {
    const tree = await api.get('/api/v1/locations/tree').set(auth());
    for (const c of tree.body) for (const s of c.secciones ?? []) for (const o of s.oficinas ?? []) {
      if (o.tipo === 'OFICINA' && !oficinaId) oficinaId = o.id;
    }
  });

  it('la migración trae categorías iniciales', async () => {
    const res = await api.get('/api/v1/supplies/categories').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.map((c: { nombre: string }) => c.nombre)).toContain('Cables y adaptadores');
  });

  it('crea una categoría nueva y rechaza un duplicado', async () => {
    const res = await api.post('/api/v1/supplies/categories').set(auth()).send({ nombre: 'Cables de video' });
    expect(res.status).toBe(201);
    categoriaId = res.body.id;

    const dup = await api.post('/api/v1/supplies/categories').set(auth()).send({ nombre: 'CABLES DE VIDEO' });
    expect(dup.status).toBe(409);
  });

  it('un técnico crea un insumo con ingreso inicial', async () => {
    const res = await api.post('/api/v1/supplies').set({ Authorization: `Bearer ${tecnicoToken}` })
      .send({ nombre: 'Cable HDMI 1,5 m', categoriaId, ingresoInicial: 10 });
    expect(res.status).toBe(201);
    expect(res.body.stock).toBe(10);
    insumoId = res.body.id;
  });

  it('registra una entrega a una oficina y queda en el detalle', async () => {
    const res = await api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth())
      .send({ tipo: 'ENTREGA', cantidad: 2, oficinaId, recibe: 'Mesa de entrada' });
    expect(res.status).toBe(201);
    expect(res.body.insumo.stock).toBe(8);
    expect(res.body.movimiento).toMatchObject({ cantidad: -2, stockResultante: 8, recibe: 'Mesa de entrada' });

    const det = await api.get(`/api/v1/supplies/${insumoId}`).set(auth());
    expect(det.body.movimientos.map((m: { tipo: string }) => m.tipo)).toEqual(['ENTREGA', 'INGRESO']);
  });

  it('no deja entregar más de lo que hay', async () => {
    const res = await api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth())
      .send({ tipo: 'ENTREGA', cantidad: 50 });
    expect(res.status).toBe(400);
    const det = await api.get(`/api/v1/supplies/${insumoId}`).set(auth());
    expect(det.body.stock).toBe(8);
  });

  it('entregas simultáneas nunca dejan el stock negativo', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () =>
      api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth()).send({ tipo: 'ENTREGA', cantidad: 3 })));
    const ok = results.filter((r) => r.status === 201).length;
    expect(ok).toBe(2); // 8 alcanza para dos entregas de 3
    const det = await api.get(`/api/v1/supplies/${insumoId}`).set(auth());
    expect(det.body.stock).toBe(2);
  });

  it('el ajuste por conteo fija el stock y exige motivo', async () => {
    const sinMotivo = await api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth())
      .send({ tipo: 'AJUSTE', stockReal: 5 });
    expect(sinMotivo.status).toBe(400);

    const res = await api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth())
      .send({ tipo: 'AJUSTE', stockReal: 5, motivo: 'Conteo mensual' });
    expect(res.status).toBe(201);
    expect(res.body.movimiento).toMatchObject({ cantidad: 3, stockResultante: 5 });
  });

  it('la edición ignora el stock y la baja bloquea movimientos', async () => {
    const edit = await api.put(`/api/v1/supplies/${insumoId}`).set(auth()).send({ stock: 999, activo: false });
    expect(edit.status).toBe(200);
    expect(edit.body.stock).toBe(5);

    const mov = await api.post(`/api/v1/supplies/${insumoId}/movements`).set(auth())
      .send({ tipo: 'INGRESO', cantidad: 1 });
    expect(mov.status).toBe(400);

    const lista = await api.get('/api/v1/supplies').set(auth());
    expect(lista.body.some((i: { id: number }) => i.id === insumoId)).toBe(false);
    const conBajas = await api.get('/api/v1/supplies').set(auth()).query({ incluirInactivos: 'true' });
    expect(conBajas.body.some((i: { id: number }) => i.id === insumoId)).toBe(true);
  });

  it('el registro global filtra por tipo', async () => {
    const res = await api.get('/api/v1/supplies/movements').set(auth()).query({ tipo: 'ENTREGA', insumoId });
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.data.every((m: { tipo: string }) => m.tipo === 'ENTREGA')).toBe(true);
  });
});
