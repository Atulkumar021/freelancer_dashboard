import { Router, Request, Response } from 'express';
import Commentary from '../models/commentary';
import { requireAuth, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const publishedOnly = req.query.published !== 'false';
  const filter: Record<string, unknown> = { companyId };
  if (publishedOnly) filter.isPublished = true;
  const commentaries = await Commentary.find(filter).sort({ financialYear: -1, month: -1 }).lean();
  res.json({ success: true, companyId, commentaries });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const { financialYear, month, period, executiveSummary, preparedBy } = req.body;
  if (!financialYear || !month || !period || !executiveSummary || !preparedBy) {
    badRequest(res, 'financialYear, month, period, executiveSummary, preparedBy required'); return;
  }
  const commentary = await Commentary.findOneAndUpdate(
    { companyId, financialYear, month },
    { $set: { ...req.body, companyId, preparedOn: req.body.preparedOn ?? new Date() } },
    { upsert: true, new: true }
  ).lean();
  res.status(201).json({ success: true, commentary });
});

router.get('/:companyId/:id', async (req: Request, res: Response) => {
  const { companyId, id } = req.params;
  const commentary = await Commentary.findOne({ _id: id, companyId }).lean();
  if (!commentary) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, commentary });
});

router.patch('/:companyId/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId, id } = req.params;
  const body = req.body;
  if (body.isPublished && !body.publishedOn) body.publishedOn = new Date();
  const commentary = await Commentary.findOneAndUpdate({ _id: id, companyId }, { $set: body }, { new: true }).lean();
  if (!commentary) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, commentary });
});

/* Update a single action item status */
router.put('/:companyId/:id/action', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId, id } = req.params;
  const { actionId, status, closedDate } = req.body;
  if (!actionId) { badRequest(res, 'actionId required'); return; }
  const updated = await Commentary.findOneAndUpdate(
    { _id: id, companyId, 'actions._id': actionId },
    { $set: { ...(status && { 'actions.$.status': status }), ...(closedDate && { 'actions.$.closedDate': new Date(closedDate) }) } },
    { new: true }
  ).lean();
  if (!updated) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, commentary: updated });
});

router.delete('/:companyId/:id', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId, id } = req.params;
  const deleted = await Commentary.findOneAndDelete({ _id: id, companyId });
  if (!deleted) { res.status(404).json({ success: false, error: 'Not found' }); return; }
  res.json({ success: true, message: 'Deleted' });
});

export default router;
