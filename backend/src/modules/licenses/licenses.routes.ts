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
  clave: z.string().max(200).optional(),
  tipo: z.string().max(50).optional(),
  proveedor: z.string().max(200).optional(),
  precioCompra: z.number().positive().optional(),
  fechaCompra: z.string().datetime().optional(),
  fechaExpiracion: z.string().datetime().optional(),
  sinExpiracion: z.boolean().optional().default(false),
  observacion: z.string().optional(),
  equipoId: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial().extend({
  version: z.string().max(50).nullable().optional(),
  clave: z.string().max(200).nullable().optional(),
  tipo: z.string().max(50).nullable().optional(),
  proveedor: z.string().max(200).nullable().optional(),
  precioCompra: z.number().positive().nullable().optional(),
  fechaCompra: z.string().datetime().nullable().optional(),
  fechaExpiracion: z.string().datetime().nullable().optional(),
  observacion: z.string().nullable().optional(),
  equipoId: z.number().int().positive().nullable().optional(),
});

// IMPORTANTE: /summary ANTES de /:id para evitar conflicto de rutas
router.get('/summary', controller.summaryHandler);
router.get('/', controller.listHandler);
router.get('/:id', controller.getOneHandler);
router.post('/', validate(createSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.delete('/:id', controller.deleteHandler);

export default router;
