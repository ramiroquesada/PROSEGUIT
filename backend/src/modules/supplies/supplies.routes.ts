import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createSupplyCategorySchema,
  updateSupplyCategorySchema,
  createSupplySchema,
  updateSupplySchema,
  supplyMovementSchema,
} from '@proseguit/shared';
import * as controller from './supplies.controller.js';

// Insumos: cualquier usuario logueado puede cargar el catálogo y registrar
// movimientos (ingresos, entregas y ajustes); no hay borrado, sólo baja.
const router = Router();

router.use(authMiddleware);

router.get('/categories', controller.listCategoriesHandler);
router.post('/categories', validate(createSupplyCategorySchema), controller.createCategoryHandler);
router.put('/categories/:id', validate(updateSupplyCategorySchema), controller.updateCategoryHandler);

router.get('/movements', controller.listMovementsHandler);

router.get('/', controller.listHandler);
router.post('/', validate(createSupplySchema), controller.createHandler);
router.get('/:id', controller.getHandler);
router.put('/:id', validate(updateSupplySchema), controller.updateHandler);
router.post('/:id/movements', validate(supplyMovementSchema), controller.movementHandler);

export default router;
