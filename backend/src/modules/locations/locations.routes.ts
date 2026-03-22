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

router.get('/tree', controller.treeHandler);

router.post('/cities', adminOnly, validate(nameSchema), controller.createCityHandler);
router.put('/cities/:id', adminOnly, validate(nameSchema), controller.updateCityHandler);

router.post('/sections', adminOnly, validate(sectionSchema), controller.createSectionHandler);
router.put('/sections/:id', adminOnly, validate(nameSchema), controller.updateSectionHandler);

router.post('/offices', adminOnly, validate(officeSchema), controller.createOfficeHandler);
router.put('/offices/:id', adminOnly, validate(nameSchema), controller.updateOfficeHandler);

export default router;
