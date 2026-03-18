import { Router } from 'express';
import { registerBathroomVisit, getDailySummary } from '../controllers/log.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Bathroom Log routes
router.post('/bathroom', requireAuth, registerBathroomVisit);
router.get('/daily-summary', requireAuth, getDailySummary);

export default router;
