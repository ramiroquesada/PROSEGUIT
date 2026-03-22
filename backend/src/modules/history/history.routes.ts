import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import * as controller from './history.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', controller.listHandler);
router.get('/equipment/:equipoId', controller.equipmentHistoryHandler);

export default router;
