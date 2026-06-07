import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import { getCurrentFYRange } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { start: fyStart, end: fyEnd } = getCurrentFYRange();

  const [purchasesByMonth, purchasesByParty, topCreditors, totalPayables, recentPayments] = await Promise.all([
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd }, partyName: { $exists: true, $ne: null } } }, { $group: { _id: '$partyName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 20 }]),
    Ledger.find({ companyId, group: 'Sundry Creditors', isDr: false }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance openingBalance gstin phone').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
    Voucher.find({ companyId, voucherType: 'Payment' }).sort({ date: -1 }).limit(10).select('date partyName amount narration').lean(),
  ]);

  const ytdPurchases   = (purchasesByMonth as any[]).reduce((s, m) => s + m.total, 0);
  const totalCred      = (totalPayables[0] as any)?.total ?? 0;
  const creditorCount  = (totalPayables[0] as any)?.count ?? 0;
  const lastMP         = (purchasesByMonth as any[]).at(-1)?.total ?? 1;
  const dpo            = Math.round((totalCred / lastMP) * 30);

  res.json({ success: true, companyId, summary: { ytdPurchases, totalPayables: totalCred, creditorCount, dpo }, purchasesByMonth, purchasesByParty, topCreditors, recentPayments });
});

export default router;
