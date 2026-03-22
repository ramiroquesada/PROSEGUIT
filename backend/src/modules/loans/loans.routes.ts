import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './loans.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const createSchema = z.object({
  equipoId: z.number().int().positive(),
  oficinaDestinoId: z.number().int().positive(),
  solicitanteFicha: z.number().int(),
  motivo: z.string().optional(),
});

const returnSchema = z.object({
  devueltoPorFicha: z.number().int(),
});

router.get('/', controller.listHandler);
router.post('/', validate(createSchema), controller.createHandler);
router.post('/:id/return', validate(returnSchema), controller.returnHandler);

export default router;
