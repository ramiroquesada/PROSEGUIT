import { z } from 'zod';

export const createCitySchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
});

export const createSectionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ciudadId: z.number().int().positive(),
});

export const createOfficeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  seccionId: z.number().int().positive(),
});

export type CreateCityInput = z.infer<typeof createCitySchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
