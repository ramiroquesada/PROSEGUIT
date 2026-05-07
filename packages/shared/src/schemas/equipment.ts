import { z } from 'zod';

export const createEquipmentSchema = z.object({
  serie: z.number().int().positive('El número de serie es obligatorio'),
  modelo: z.string().optional(),
  templateId: z.number().int().optional(),
  tipoEquipoId: z.number().int().positive('El tipo de equipo es obligatorio'),
  oficinaId: z.number().int().positive('La oficina es obligatoria'),
  ip: z.string().optional(),
  mac: z.string().optional(),
  matricula: z.string().optional(),
  asignadoA: z.string().optional(),
  proveedor: z.string().optional(),
  fechaAdquisicion: z.coerce.date().optional().nullable(),
  nroInventario: z.string().optional(),
  garantiaHasta: z.coerce.date().optional().nullable(),
  fechaFinVida: z.coerce.date().optional().nullable(),
  precioCompra: z.number().positive().optional().nullable(),
  observacion: z.string().optional(),
  especificaciones: z.record(z.string(), z.unknown()).optional(),
});

export const transferEquipmentSchema = z.object({
  oficinaDestinoId: z.number().int().positive('La oficina destino es obligatoria'),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
  comentario: z.string().optional(),
});

export const sendToSupportSchema = z.object({
  motivo: z.string().min(1, 'El motivo es obligatorio'),
  comentario: z.string().optional(),
});

export const sendToServiceSchema = z.object({
  servicioId: z.number().int().positive('El servicio externo es obligatorio'),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
  comentario: z.string().optional(),
});
