import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './service-providers.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  nombre: z.string().min(1),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  activo: z.boolean().optional(),
});

router.get('/', controller.listHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', adminOnly, validate(createSchema), controller.createHandler);
router.put('/:id', adminOnly, validate(updateSchema), controller.updateHandler);

export default router;
