import { z } from 'zod';

export const createUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ficha: z.number().int().positive('La ficha es obligatoria'),
  email: z.string().email().optional().or(z.literal('')),
  rol: z.enum(['ADMIN', 'TECNICO']),
  oficinaId: z.number().int().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ ficha: true });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
