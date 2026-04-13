import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './licenses.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  software: z.string().min(1, 'Software es requerido').max(100),
  version: z.string().max(50).optional(),
  fechaExpiracion: z.string().datetime().optional(),
  equipoId: z.number().int().positive('ID de equipo debe ser positivo'),
});

const updateSchema = z.object({
  software: z.string().min(1).max(100).optional(),
  version: z.string().max(50).optional().nullable(),
  fechaExpiracion: z.string().datetime().optional().nullable(),
});

// IMPORTANTE: /summary ANTES de /:id para evitar conflicto de rutas
router.get('/summary', controller.summaryHandler);
router.get('/', controller.listHandler);
router.get('/:id', controller.getOneHandler);
router.post('/', validate(createSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.delete('/:id', controller.deleteHandler);

export default router;
