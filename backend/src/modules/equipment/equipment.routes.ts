import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './equipment.controller.js';
import {
  createEquipmentSchema,
  transferEquipmentSchema,
  sendToSupportSchema,
  sendToServiceSchema,
} from '@proseguit/shared';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const updateSchema = createEquipmentSchema.partial().extend({
  motivo: z.string().min(1),
});

const returnFromServiceSchema = sendToSupportSchema.extend({
  diagnostico: z.string().optional(),
});

const sendToSupportExtSchema = sendToSupportSchema.extend({
  oficinaDestinoId: z.number().int().positive().optional(),
});

// Routes
router.get('/', controller.listHandler);
router.get('/types', controller.typesHandler);
router.get('/next-serie', controller.nextSerieHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', validate(createEquipmentSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.post('/:id/transfer', validate(transferEquipmentSchema), controller.transferHandler);
router.post('/:id/send-to-support', validate(sendToSupportExtSchema), controller.sendToSupportHandler);
router.post('/:id/send-to-service', validate(sendToServiceSchema), controller.sendToServiceHandler);
router.post('/:id/return-from-service', validate(returnFromServiceSchema), controller.returnFromServiceHandler);

export default router;
