import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import { getActiveFYRange, branchMatch } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const companyId = req.params.companyId as string;
  const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
  const branch    = typeof req.query.branch === 'string' ? req.query.branch : undefined;
  const { start: fyStart, end: fyEnd } = await getActiveFYRange(companyId, fyParam);
  const bm = branchMatch(branch);
  const base = { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd }, ...bm };

  const [purchasesByMonth, purchasesByParty, topCreditors, totalPayables, recentPayments] = await Promise.all([
    Voucher.aggregate([{ $match: base }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { ...base, partyName: { $exists: true, $ne: null } } }, { $group: { _id: '$partyName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 20 }]),
    Ledger.find({ companyId, group: 'Sundry Creditors', isDr: false }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance openingBalance gstin phone').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
    Voucher.find({ companyId, voucherType: 'Payment', ...bm }).sort({ date: -1 }).limit(10).select('date partyName amount narration').lean(),
  ]);

  const ytdPurchases   = (purchasesByMonth as any[]).reduce((s, m) => s + m.total, 0);
  const totalCred      = (totalPayables[0] as any)?.total ?? 0;
  const creditorCount  = (totalPayables[0] as any)?.count ?? 0;
  const lastMP         = (purchasesByMonth as any[]).at(-1)?.total ?? 1;
  const dpo            = Math.round((totalCred / lastMP) * 30);

  res.json({ success: true, companyId, summary: { ytdPurchases, totalPayables: totalCred, creditorCount, dpo }, purchasesByMonth, purchasesByParty, topCreditors, recentPayments });
});

export default router;
