import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './model-templates.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  nombre: z.string().min(1),
  tipoEquipoId: z.number().int().positive(),
  marca: z.string().optional(),
  especificaciones: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

router.get('/', controller.listHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', adminOnly, validate(createSchema), controller.createHandler);
router.put('/:id', adminOnly, validate(updateSchema), controller.updateHandler);
router.delete('/:id', adminOnly, controller.deleteHandler);

export default router;
