import { Router } from 'express';
import { authMiddleware, adminOnly } from '../../middleware/auth.js';
import * as controller from './access-log.controller.js';

const router = Router();

router.use(authMiddleware, adminOnly);

router.get('/', controller.listHandler);
router.get('/summary', controller.summaryHandler);

export default router;
