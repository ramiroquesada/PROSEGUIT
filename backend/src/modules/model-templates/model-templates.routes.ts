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
router.post('/', validate(createSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.delete('/:id', controller.deleteHandler);

export default router;
