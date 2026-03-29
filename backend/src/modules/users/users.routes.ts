import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './users.controller.js';
import { createUserSchema, changePasswordSchema } from '@proseguit/shared';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const updateSchema = createUserSchema.partial().extend({
  activo: z.boolean().optional(),
});

// Cambiar contraseña propia (cualquier usuario autenticado)
router.post('/change-password', validate(changePasswordSchema), controller.changePasswordHandler);

// CRUD usuarios (solo admin)
router.get('/', adminOnly, controller.listHandler);
router.get('/:id', adminOnly, controller.getByIdHandler);
router.post('/', adminOnly, validate(createUserSchema), controller.createHandler);
router.put('/:id', adminOnly, validate(updateSchema), controller.updateHandler);
router.post('/:id/reset-password', adminOnly, controller.resetPasswordHandler);

export default router;
