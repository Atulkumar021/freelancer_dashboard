import { Router, Request, Response } from 'express';
import ActivityLog from '../models/activityLog';
import { requireJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', requireJwt, requireRole('superadmin'), async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? '100', 10), 200);
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, logs });
});

export default router;
