import { describe, expect, it, beforeAll } from 'vitest';
import { prisma } from '../utils/prisma.js';
import { api, getAdminToken, getTecnicoToken } from './helpers.js';

let adminToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
}, 15_000);

describe('Ubicaciones — movimiento de oficina entre ciudades', () => {
  it('mueve la oficina con sus equipos y registra la auditoría', async () => {
    const sourceSection = await api
      .post('/api/v1/locations/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Origen QA', ciudadId: 1 });
    expect(sourceSection.status).toBe(201);

    const office = await api
      .post('/api/v1/locations/offices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Archivo QA', seccionId: sourceSection.body.id });
    expect(office.status).toBe(201);

    const destinationCity = await api
      .post('/api/v1/locations/cities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Dolores QA' });
    expect(destinationCity.status).toBe(201);

    const destinationSection = await api
      .post('/api/v1/locations/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Administración QA', ciudadId: destinationCity.body.id });
    expect(destinationSection.status).toBe(201);

    const equipment = await api
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serie: 900_001,
        tipoEquipoId: 1,
        oficinaId: office.body.id,
        modelo: 'Equipo impacto movimiento',
      });
    expect(equipment.status).toBe(201);

    const preview = await api
      .get(`/api/v1/locations/offices/${office.body.id}/move-preview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({
      nombre: 'Archivo QA',
      cantidadEquipos: 1,
      ubicacionActual: {
        ciudadNombre: 'Mercedes QA',
        seccionNombre: 'Origen QA',
      },
    });

    const moved = await api
      .patch(`/api/v1/locations/offices/${office.body.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        seccionId: destinationSection.body.id,
        motivo: 'Reorganización inicial de la jerarquía',
      });
    expect(moved.status).toBe(200);
    expect(moved.body.oficina).toMatchObject({
      id: office.body.id,
      seccionId: destinationSection.body.id,
    });
    expect(moved.body.movimiento).toMatchObject({
      entidad: 'OFICINA',
      entidadId: office.body.id,
      origenCiudadNombre: 'Mercedes QA',
      origenSeccionNombre: 'Origen QA',
      destinoCiudadNombre: 'Dolores QA',
      destinoSeccionNombre: 'Administración QA',
      cantidadEquipos: 1,
      motivo: 'Reorganización inicial de la jerarquía',
    });

    const storedOffice = await prisma.oficina.findUnique({ where: { id: office.body.id } });
    expect(storedOffice?.seccionId).toBe(destinationSection.body.id);

    const audit = await prisma.movimientoUbicacion.findFirst({
      where: { entidad: 'OFICINA', entidadId: office.body.id },
      include: { usuario: true },
    });
    expect(audit?.usuario.ficha).toBe(9999);
    expect(audit?.cantidadEquipos).toBe(1);
  });

  it('impide que un técnico consulte el movimiento administrativo', async () => {
    const tecnicoToken = await getTecnicoToken();
    const response = await api
      .get('/api/v1/locations/offices/1/move-preview')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect(response.status).toBe(403);
  });
});
