import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './equipment.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

// Schemas
const createSchema = z.object({
  serie: z.number().int().positive(),
  modelo: z.string().optional(),
  templateId: z.number().int().optional(),
  tipoEquipoId: z.number().int().positive(),
  oficinaId: z.number().int().positive(),
  ip: z.string().optional(),
  urlImage: z.string().optional(),
  observacion: z.string().optional(),
  especificaciones: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

const transferSchema = z.object({
  oficinaDestinoId: z.number().int().positive(),
  motivo: z.string().min(1),
  comentario: z.string().optional(),
});

const supportSchema = z.object({
  motivo: z.string().min(1),
  comentario: z.string().optional(),
});

const serviceSchema = z.object({
  servicioId: z.number().int().positive(),
  motivo: z.string().min(1),
  comentario: z.string().optional(),
});

const decommissionSchema = z.object({
  motivo: z.string().min(1),
  comentario: z.string().optional(),
});

// Routes
router.get('/', controller.listHandler);
router.get('/types', controller.typesHandler);
router.get('/:id', controller.getByIdHandler);
router.post('/', validate(createSchema), controller.createHandler);
router.put('/:id', validate(updateSchema), controller.updateHandler);
router.post('/:id/transfer', validate(transferSchema), controller.transferHandler);
router.post('/:id/send-to-support', validate(supportSchema), controller.sendToSupportHandler);
router.post('/:id/send-to-service', validate(serviceSchema), controller.sendToServiceHandler);
router.post('/:id/decommission', validate(decommissionSchema), controller.decommissionHandler);

export default router;
