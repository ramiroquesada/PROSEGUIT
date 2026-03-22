import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './users.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  nombre: z.string().min(1),
  ficha: z.number().int().positive(),
  email: z.string().email().optional(),
  rol: z.enum(['ADMIN', 'TECNICO']),
  oficinaId: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  rol: z.enum(['ADMIN', 'TECNICO']).optional(),
  activo: z.boolean().optional(),
  oficinaId: z.number().int().positive().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Cambiar contraseña propia (cualquier usuario autenticado)
router.post('/change-password', validate(changePasswordSchema), controller.changePasswordHandler);

// CRUD usuarios (solo admin)
router.get('/', controller.listHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', adminOnly, validate(createSchema), controller.createHandler);
router.put('/:id', adminOnly, validate(updateSchema), controller.updateHandler);
router.post('/:id/reset-password', adminOnly, controller.resetPasswordHandler);

export default router;
