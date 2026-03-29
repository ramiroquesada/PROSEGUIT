import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './locations.controller.js';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

const nameSchema = z.object({ nombre: z.string().min(1) });
const sectionSchema = z.object({ nombre: z.string().min(1), ciudadId: z.number().int().positive() });
const officeSchema = z.object({ nombre: z.string().min(1), seccionId: z.number().int().positive() });
const moveOfficeSchema = z.object({ seccionId: z.number().int().positive() });
const moveSectionSchema = z.object({ ciudadId: z.number().int().positive() });

router.get('/tree', controller.treeHandler);

router.post('/cities', validate(nameSchema), controller.createCityHandler);
router.put('/cities/:id', validate(nameSchema), controller.updateCityHandler);
router.delete('/cities/:id', controller.deleteCityHandler);

router.post('/sections', validate(sectionSchema), controller.createSectionHandler);
router.put('/sections/:id', validate(nameSchema), controller.updateSectionHandler);
router.delete('/sections/:id', controller.deleteSectionHandler);
router.patch('/sections/:id/move', validate(moveSectionSchema), controller.moveSectionHandler);

router.post('/offices', validate(officeSchema), controller.createOfficeHandler);
router.put('/offices/:id', validate(nameSchema), controller.updateOfficeHandler);
router.delete('/offices/:id', controller.deleteOfficeHandler);
router.patch('/offices/:id/move', validate(moveOfficeSchema), controller.moveOfficeHandler);

export default router;
