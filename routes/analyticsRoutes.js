import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import restrictToAdmin from '../middleware/adminMiddleware.js';
import { getOverviewAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.get('/overview', protect, restrictToAdmin, getOverviewAnalytics);

export default router;
