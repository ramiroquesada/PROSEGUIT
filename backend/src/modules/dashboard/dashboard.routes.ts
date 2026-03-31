import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', controller.statsHandler);
router.get('/recent-activity', controller.recentActivityHandler);
router.get('/loans-alerts', controller.loansAlertsHandler);
router.get('/repair-alerts', controller.repairAlertsHandler);
router.get('/equipment-by-type', controller.equipmentByTypeHandler);

export default router;
