import { Router, Request, Response } from 'express';
import AdvisoryAction from '../models/advisoryAction';
import { requireAuth, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const filter: Record<string, unknown> = { companyId };
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;

  const [actions, stats] = await Promise.all([
    AdvisoryAction.find(filter).sort({ priority: 1, dueDate: 1 }).lean(),
    AdvisoryAction.aggregate([{ $match: { companyId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const statsMap = Object.fromEntries((stats as any[]).map((s) => [s._id, s.count]));
  res.json({ success: true, companyId, actions, stats: statsMap });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const { title, category, priority, owner, dueDate, addedBy } = req.body;
  if (!title || !category || !priority || !owner || !dueDate || !addedBy) {
    badRequest(res, 'title, category, priority, owner, dueDate, addedBy required'); return;
  }
  const count    = await AdvisoryAction.countDocuments({ companyId });
  const actionId = `ADV-${String(count + 1).padStart(3, '0')}`;
  const action   = await AdvisoryAction.create({ ...req.body, companyId, actionId, addedOn: new Date(), status: req.body.status ?? 'Open' });
  res.status(201).json({ success: true, action });
});

router.get('/:companyId/:id', async (req: Request, res: Response) => {
  const { companyId, id } = req.params;
  const action = await AdvisoryAction.findOne({ $or: [{ _id: id }, { actionId: id }], companyId }).lean();
  if (!action) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, action });
});

router.patch('/:companyId/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId, id } = req.params;
  const body = req.body;
  if (body.status === 'Done' && !body.closedDate) body.closedDate = new Date();
  const action = await AdvisoryAction.findOneAndUpdate({ $or: [{ _id: id }, { actionId: id }], companyId }, { $set: body }, { new: true }).lean();
  if (!action) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, action });
});

router.delete('/:companyId/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId, id } = req.params;
  const deleted = await AdvisoryAction.findOneAndDelete({ $or: [{ _id: id }, { actionId: id }], companyId });
  if (!deleted) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, message: 'Deleted' });
});

export default router;
