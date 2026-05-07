import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/prisma.js', () => ({
  prisma: {
    equipo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    oficina: {
      findUnique: vi.fn(),
    },
    servicioExterno: {
      findUnique: vi.fn(),
    },
    envioServicio: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    equipoImagen: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    historial: {
      create: vi.fn(),
    },
    modeloTemplate: {
      findUnique: vi.fn(),
    },
  },
}));

import { transferEquipment, sendToSupport, createEquipment, updateEquipment, getNextSerie, returnFromService, saveEquipmentImage, deleteEquipmentImage, updateImageDescription } from './equipment.service.js';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

const mockPrisma = prisma as unknown as {
  equipo: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  oficina: { findUnique: ReturnType<typeof vi.fn> };
  servicioExterno: { findUnique: ReturnType<typeof vi.fn> };
  envioServicio: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  equipoImagen: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  historial: { create: ReturnType<typeof vi.fn> };
  modeloTemplate: { findUnique: ReturnType<typeof vi.fn> };
};

// ─── transferEquipment ───────────────────────────────────────────────────────

describe('transferEquipment — accion según estado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('usa ASIGNACION cuando el equipo está en NUEVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'NUEVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Contabilidad' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Primera asignación' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'ASIGNACION' }) },
        }),
      }),
    );
  });

  it('usa ASIGNACION cuando el equipo está EN_DEPOSITO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'EN_DEPOSITO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Tesorería' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Asignación desde depósito' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'ASIGNACION' }) },
        }),
      }),
    );
  });

  it('usa RETORNO_SOPORTE cuando el equipo está EN_REPARACION', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'EN_REPARACION' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Recursos Humanos' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Retorno de reparación' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'RETORNO_SOPORTE' }) },
        }),
      }),
    );
  });

  it('usa TRANSFERENCIA cuando el equipo está ACTIVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 1, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 2, nombre: 'Sistemas' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await transferEquipment(1, { oficinaDestinoId: 2, motivo: 'Traslado' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historial: { create: expect.objectContaining({ accion: 'TRANSFERENCIA' }) },
        }),
      }),
    );
  });

  it('lanza 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    await expect(transferEquipment(999, { oficinaDestinoId: 2, motivo: 'Test' }, 99))
      .rejects.toThrow(AppError);
    await expect(transferEquipment(999, { oficinaDestinoId: 2, motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('lanza 400 si la oficina destino es la misma que la actual', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 5, estado: 'ACTIVO' });

    await expect(transferEquipment(1, { oficinaDestinoId: 5, motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── estadoPorOficina (via transferEquipment) ────────────────────────────────

describe('transferEquipment — estado según nombre de oficina destino', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deriva EN_REPARACION para oficina con "soporte" en el nombre', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 1, nombre: 'Informatica - Soporte' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 1, motivo: 'A soporte' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'EN_REPARACION' }) }),
    );
  });

  it('deriva EN_DEPOSITO para oficina con "deposito" (con tilde) en el nombre', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 3, nombre: 'Depósito General' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 3, motivo: 'A depósito' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'EN_DEPOSITO' }) }),
    );
  });

  it('deriva ACTIVO para cualquier otra oficina', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 2, estado: 'ACTIVO' });
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 4, nombre: 'Contaduría' });
    mockPrisma.equipo.update.mockResolvedValue({});

    await transferEquipment(1, { oficinaDestinoId: 4, motivo: 'Traslado' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'ACTIVO' }) }),
    );
  });
});

// ─── sendToSupport ───────────────────────────────────────────────────────────

describe('sendToSupport', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pone estado EN_REPARACION y registra ENVIO_SOPORTE', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, oficinaId: 5, estado: 'ACTIVO' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, tipoEquipo: {}, oficina: { seccion: { ciudad: {} } } });

    await sendToSupport(1, { motivo: 'No enciende' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_REPARACION',
          historial: { create: expect.objectContaining({ accion: 'ENVIO_SOPORTE' }) },
        }),
      }),
    );
  });

  it('lanza 404 si el equipo no existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);

    await expect(sendToSupport(999, { motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createEquipment ─────────────────────────────────────────────────────────

describe('createEquipment', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('crea el equipo con estado NUEVO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null); // no existe aún
    mockPrisma.equipo.create.mockResolvedValue({ id: 1, serie: 42, estado: 'NUEVO', tipoEquipo: {}, oficina: {} });

    await createEquipment({ serie: 42, tipoEquipoId: 1, oficinaId: 10 }, 99);

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'NUEVO',
          historial: { create: expect.objectContaining({ accion: 'CREACION' }) },
        }),
      }),
    );
  });

  it('lanza 409 si la serie ya existe', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 5, serie: 42 });

    await expect(createEquipment({ serie: 42, tipoEquipoId: 1, oficinaId: 10 }, 99))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('should create equipment with valid templateId', async () => {
    const tipoId = 1;
    const templateId = 1;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce(null); // no existing serie
    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'HP EliteDesk 800',
      tipoEquipoId: tipoId,
      marca: 'HP',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    mockPrisma.equipo.create.mockResolvedValueOnce({
      id: 1,
      serie: 9999,
      templateId: templateId,
      tipoEquipoId: tipoId,
      modelo: 'Test Model',
      tipoEquipo: { id: tipoId, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Informatica - Soporte' },
    } as any);

    const result = await createEquipment({
      serie: 9999,
      templateId: templateId,
      tipoEquipoId: tipoId,
      oficinaId: 1,
    }, 1);

    expect(result.templateId).toBe(templateId);
    expect(mockPrisma.modeloTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: templateId },
    });
  });

  it('should reject templateId that does not match tipoEquipoId', async () => {
    const tipoId = 1;
    const templateId = 2;
    const wrongTipoId = 3;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);
    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'Dell OptiPlex',
      tipoEquipoId: wrongTipoId,
      marca: 'Dell',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    await expect(
      createEquipment({
        serie: 9999,
        templateId: templateId,
        tipoEquipoId: tipoId,
        oficinaId: 1,
      }, 1)
    ).rejects.toThrow('La plantilla no corresponde al tipo de equipo seleccionado');
  });

  it('should throw 404 if templateId does not exist', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);
    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce(null);

    await expect(
      createEquipment({
        serie: 9999,
        templateId: 999,
        tipoEquipoId: 1,
        oficinaId: 1,
      }, 1)
    ).rejects.toThrow('Plantilla no encontrada');
  });
});

// ─── returnFromService ───────────────────────────────────────────────────────

describe('returnFromService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lanza 400 si el equipo no está EN_SERVICIO_EXTERNO', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, estado: 'ACTIVO' });

    await expect(returnFromService(1, { motivo: 'Test' }, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('deriva estado de la oficina actual (oficina estándar → ACTIVO)', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, serie: 100, estado: 'EN_SERVICIO_EXTERNO', oficinaId: 3 });
    mockPrisma.envioServicio.findFirst.mockResolvedValue(null);
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 3, nombre: 'Oficina General' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 1, estado: 'ACTIVO' });

    await returnFromService(1, { motivo: 'Reparado' }, 99);

    expect(mockPrisma.oficina.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
          historial: { create: expect.objectContaining({ accion: 'RETORNO_SERVICIO_EXTERNO' }) },
        }),
      }),
    );
  });

  it('deriva EN_DEPOSITO si el equipo está en oficina tipo depósito', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 2, serie: 200, estado: 'EN_SERVICIO_EXTERNO', oficinaId: 7 });
    mockPrisma.envioServicio.findFirst.mockResolvedValue(null);
    mockPrisma.oficina.findUnique.mockResolvedValue({ id: 7, nombre: 'Depósito' });
    mockPrisma.equipo.update.mockResolvedValue({ id: 2, estado: 'EN_DEPOSITO' });

    await returnFromService(2, { motivo: 'Vuelve de service' }, 99);

    expect(mockPrisma.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_DEPOSITO',
        }),
      }),
    );
  });
});

// ─── getNextSerie ─────────────────────────────────────────────────────────────

describe('getNextSerie', () => {
  it('devuelve max + 1', async () => {
    mockPrisma.equipo.aggregate.mockResolvedValue({ _max: { serie: 150 } });
    const next = await getNextSerie();
    expect(next).toBe(151);
  });

  it('devuelve 1 si no hay equipos', async () => {
    mockPrisma.equipo.aggregate.mockResolvedValue({ _max: { serie: null } });
    const next = await getNextSerie();
    expect(next).toBe(1);
  });
});

// ─── createEquipment — campos de ciclo de vida ──────────────────────────────

describe('createEquipment — campos de ciclo de vida', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('persiste fechaFinVida y precioCompra cuando se proveen', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    mockPrisma.equipo.create.mockResolvedValue({
      id: 1,
      tipoEquipo: { id: 1, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte', seccion: { ciudad: {} } },
    });

    await createEquipment(
      {
        serie: 999,
        tipoEquipoId: 1,
        oficinaId: 1,
        fechaFinVida: new Date('2030-01-01'),
        precioCompra: 25000,
      },
      1,
    );

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fechaFinVida: new Date('2030-01-01'),
          precioCompra: 25000,
        }),
      }),
    );
  });

  it('acepta fechaFinVida y precioCompra como undefined cuando no se proveen', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue(null);
    mockPrisma.equipo.create.mockResolvedValue({
      id: 2,
      tipoEquipo: { id: 1, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte', seccion: { ciudad: {} } },
    });

    await createEquipment({ serie: 1000, tipoEquipoId: 1, oficinaId: 1 }, 1);

    expect(mockPrisma.equipo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fechaFinVida: undefined,
          precioCompra: undefined,
        }),
      }),
    );
  });
});

// ─── saveEquipmentImage ──────────────────────────────────────────────────────

describe('saveEquipmentImage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('crea la imagen y registra FOTO_AGREGADA en historial', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.create.mockResolvedValue({ id: 10, url: '/uploads/equipment/test.jpg', descripcion: null });
    mockPrisma.historial.create.mockResolvedValue({});

    const result = await saveEquipmentImage(1, '/tmp/uploads/equipment/test.jpg', 99);

    expect(mockPrisma.equipoImagen.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ equipoId: 1, descripcion: undefined }) })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'FOTO_AGREGADA', usuarioId: 99, equipoId: 1 }),
      })
    );
    expect(result.id).toBe(10);
  });

  it('pasa la descripcion al crear la imagen', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.create.mockResolvedValue({ id: 11, url: '/uploads/equipment/x.jpg', descripcion: 'Vista frontal' });
    mockPrisma.historial.create.mockResolvedValue({});

    await saveEquipmentImage(1, '/tmp/uploads/equipment/x.jpg', 99, 'Vista frontal');

    expect(mockPrisma.equipoImagen.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ descripcion: 'Vista frontal' }) })
    );
  });
});

// ─── deleteEquipmentImage ────────────────────────────────────────────────────

describe('deleteEquipmentImage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('hace soft-delete y registra FOTO_ELIMINADA en historial', async () => {
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });
    mockPrisma.equipoImagen.findFirst.mockResolvedValue({ id: 10, equipoId: 1, url: '/uploads/equipment/test.jpg', deletedAt: null });
    mockPrisma.equipoImagen.update.mockResolvedValue({});
    mockPrisma.historial.create.mockResolvedValue({});

    await deleteEquipmentImage(1, 10, 99);

    expect(mockPrisma.equipoImagen.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'FOTO_ELIMINADA', usuarioId: 99, equipoId: 1 }),
      })
    );
  });

  it('lanza 404 si la imagen no existe', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue(null);

    await expect(deleteEquipmentImage(1, 99, 1)).rejects.toThrow('Imagen no encontrada');
  });
});

// ─── updateImageDescription ──────────────────────────────────────────────────

describe('updateImageDescription', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('actualiza la descripcion y registra EDICION en historial', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue({ id: 10, equipoId: 1, url: '/uploads/equipment/test.jpg', deletedAt: null });
    mockPrisma.equipoImagen.update.mockResolvedValue({ id: 10, descripcion: 'Nueva desc' });
    mockPrisma.historial.create.mockResolvedValue({});
    mockPrisma.equipo.findUnique.mockResolvedValue({ id: 1, oficinaId: 5 });

    await updateImageDescription(1, 10, 'Nueva desc', 99);

    expect(mockPrisma.equipoImagen.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { descripcion: 'Nueva desc' } })
    );
    expect(mockPrisma.historial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'EDICION', usuarioId: 99, equipoId: 1 }),
      })
    );
  });

  it('lanza 404 si la imagen no existe o está eliminada', async () => {
    mockPrisma.equipoImagen.findFirst.mockResolvedValue(null);

    await expect(updateImageDescription(1, 99, 'desc', 1)).rejects.toThrow('Imagen no encontrada');
  });
});

// ─── updateEquipment — templateId validation ─────────────────────────────────

describe('updateEquipment — templateId validation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should update equipment with valid templateId', async () => {
    const equipoId = 1;
    const tipoId = 1;
    const templateId = 1;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: tipoId,
      templateId: null,
      serie: 100,
      modelo: 'Old Model',
      ip: null,
      mac: null,
      matricula: null,
      asignadoA: null,
      proveedor: null,
      fechaAdquisicion: null,
      nroInventario: null,
      garantiaHasta: null,
      fechaFinVida: null,
      precioCompra: null,
      observacion: null,
      especificaciones: null,
      oficina: { id: 1, nombre: 'Soporte', seccion: { ciudad: {} } },
    } as any);

    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'HP EliteDesk 800',
      tipoEquipoId: tipoId,
      marca: 'HP',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    mockPrisma.equipo.update.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: tipoId,
      templateId: templateId,
      tipoEquipo: { id: tipoId, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    const result = await updateEquipment(
      equipoId,
      { templateId: templateId, motivo: 'Update template' },
      1
    );

    expect(result.templateId).toBe(templateId);
    expect(mockPrisma.modeloTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: templateId },
    });
  });

  it('should update equipment with templateId when tipoEquipoId is also updated', async () => {
    const equipoId = 1;
    const oldTipoId = 1;
    const newTipoId = 2;
    const templateId = 5;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: oldTipoId,
      templateId: null,
      serie: 100,
      modelo: 'Old Model',
      ip: null,
      mac: null,
      matricula: null,
      asignadoA: null,
      proveedor: null,
      fechaAdquisicion: null,
      nroInventario: null,
      garantiaHasta: null,
      fechaFinVida: null,
      precioCompra: null,
      observacion: null,
      especificaciones: null,
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'Dell OptiPlex',
      tipoEquipoId: newTipoId,
      marca: 'Dell',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    mockPrisma.equipo.update.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: newTipoId,
      templateId: templateId,
      tipoEquipo: { id: newTipoId, nombre: 'Laptop' },
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    const result = await updateEquipment(
      equipoId,
      { tipoEquipoId: newTipoId, templateId: templateId, motivo: 'Update both' },
      1
    );

    expect(result.templateId).toBe(templateId);
    expect(result.tipoEquipoId).toBe(newTipoId);
  });

  it('should reject templateId that does not match current tipoEquipoId', async () => {
    const equipoId = 1;
    const tipoId = 1;
    const templateId = 2;
    const wrongTipoId = 3;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: tipoId,
      templateId: null,
      serie: 100,
      modelo: 'Model',
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'Dell OptiPlex',
      tipoEquipoId: wrongTipoId,
      marca: 'Dell',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    await expect(
      updateEquipment(
        equipoId,
        { templateId: templateId, motivo: 'Update template' },
        1
      )
    ).rejects.toThrow('La plantilla no corresponde al tipo de equipo seleccionado');
  });

  it('should reject templateId that does not match new tipoEquipoId', async () => {
    const equipoId = 1;
    const oldTipoId = 1;
    const newTipoId = 2;
    const templateId = 5;
    const wrongTipoId = 3;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: oldTipoId,
      templateId: null,
      serie: 100,
      modelo: 'Old Model',
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce({
      id: templateId,
      nombre: 'Some Template',
      tipoEquipoId: wrongTipoId,
      marca: 'Brand',
      especificaciones: {},
      createdAt: new Date(),
    } as any);

    await expect(
      updateEquipment(
        equipoId,
        { tipoEquipoId: newTipoId, templateId: templateId, motivo: 'Update both' },
        1
      )
    ).rejects.toThrow('La plantilla no corresponde al tipo de equipo seleccionado');
  });

  it('should allow clearing templateId by setting it to null', async () => {
    const equipoId = 1;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: 1,
      templateId: 2,
      serie: 100,
      modelo: 'Model',
      ip: null,
      mac: null,
      matricula: null,
      asignadoA: null,
      proveedor: null,
      fechaAdquisicion: null,
      nroInventario: null,
      garantiaHasta: null,
      fechaFinVida: null,
      precioCompra: null,
      observacion: null,
      especificaciones: null,
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    mockPrisma.equipo.update.mockResolvedValueOnce({
      id: equipoId,
      templateId: null,
      tipoEquipo: { id: 1, nombre: 'PC' },
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    const result = await updateEquipment(
      equipoId,
      { templateId: null, motivo: 'Clear template' },
      1
    );

    expect(result.templateId).toBeNull();
    // modeloTemplate.findUnique should not be called when templateId is null
    expect(mockPrisma.modeloTemplate.findUnique).not.toHaveBeenCalled();
  });

  it('should throw 404 if templateId does not exist', async () => {
    const equipoId = 1;

    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      id: equipoId,
      tipoEquipoId: 1,
      templateId: null,
      serie: 100,
      modelo: 'Model',
      oficina: { id: 1, nombre: 'Soporte' },
    } as any);

    mockPrisma.modeloTemplate.findUnique.mockResolvedValueOnce(null);

    await expect(
      updateEquipment(
        equipoId,
        { templateId: 999, motivo: 'Update template' },
        1
      )
    ).rejects.toThrow('Plantilla no encontrada');
  });
});
