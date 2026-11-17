import { z } from 'zod';

const texto = (max: number) => z.string().trim().max(max);

export const createSupplyCategorySchema = z.object({
  nombre: texto(60).min(1, 'El nombre es obligatorio'),
});

export const updateSupplyCategorySchema = createSupplyCategorySchema;

export const createSupplySchema = z.object({
  nombre: texto(120).min(1, 'El nombre es obligatorio'),
  categoriaId: z.number().int().positive('La categoría es obligatoria'),
  unidad: texto(30).min(1).optional(),
  observacion: z.string().optional(),
  /** Si se indica, se registra como primer INGRESO. */
  ingresoInicial: z.number().int().min(0).optional(),
});

export const updateSupplySchema = z.object({
  nombre: texto(120).min(1).optional(),
  categoriaId: z.number().int().positive().optional(),
  unidad: texto(30).min(1).optional(),
  observacion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
});

const cantidad = z.number().int().positive('La cantidad debe ser mayor a 0');

export const supplyMovementSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('INGRESO'),
    cantidad,
    motivo: z.string().optional(),
  }),
  z.object({
    tipo: z.literal('ENTREGA'),
    cantidad,
    oficinaId: z.number().int().positive().optional(),
    /** Serie del equipo donde se instaló o al que acompaña (opcional). */
    equipoSerie: z.number().int().positive().optional(),
    recibe: texto(120).optional(),
    motivo: z.string().optional(),
  }),
  z.object({
    tipo: z.literal('AJUSTE'),
    /** Cantidad contada físicamente: el stock pasa a ser este valor. */
    stockReal: z.number().int().min(0, 'El conteo no puede ser negativo'),
    motivo: z.string().trim().min(1, 'Indicá el motivo del ajuste'),
  }),
]);

export type SupplyMovementInput = z.infer<typeof supplyMovementSchema>;
