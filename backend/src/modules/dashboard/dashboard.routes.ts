import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import * as controller from './dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', controller.statsHandler);
router.get('/recent-activity', controller.recentActivityHandler);

export default router;
