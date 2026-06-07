import { Router, Request, Response } from 'express';
import ComplianceFiling from '../models/complianceFiling';
import { requireAuth, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const fy = req.query.fy as string | undefined;
  const filter: Record<string, unknown> = { companyId };
  if (fy) filter.financialYear = fy;

  const [filings, stats] = await Promise.all([
    ComplianceFiling.find(filter).sort({ dueDate: 1 }).lean(),
    ComplianceFiling.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const today = new Date();
  const in14  = new Date(today.getTime() + 14 * 86_400_000);
  for (const f of filings as any[]) {
    if (!['filed','paid','in-progress'].includes(f.status)) {
      let newStatus = f.status;
      if (new Date(f.dueDate) < today) newStatus = 'overdue';
      else if (new Date(f.dueDate) <= in14) newStatus = 'due-soon';
      else newStatus = 'upcoming';
      if (newStatus !== f.status) {
        await ComplianceFiling.findByIdAndUpdate(f._id, { status: newStatus });
        f.status = newStatus;
      }
    }
  }

  const statsMap = Object.fromEntries((stats as any[]).map((s) => [s._id, s.count]));
  const score = filings.length > 0
    ? Math.round(((statsMap['filed'] ?? 0) + (statsMap['paid'] ?? 0)) / filings.length * 100)
    : 100;

  res.json({ success: true, companyId, overallScore: score, stats: statsMap, filings });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const filing = await ComplianceFiling.create({ ...req.body, companyId });
  res.status(201).json({ success: true, filing });
});

router.patch('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const { filingId, ...update } = req.body;
  if (!filingId) { badRequest(res, 'filingId required'); return; }
  const filing = await ComplianceFiling.findOneAndUpdate({ _id: filingId, companyId }, { $set: update }, { new: true }).lean();
  if (!filing) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, filing });
});

export default router;
