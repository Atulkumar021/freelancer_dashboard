import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import { getActiveFYRange, branchMatch } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId as string;
    const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
    const branch    = typeof req.query.branch === 'string' ? req.query.branch : undefined;
    const { start: fyStart, end: fyEnd, label: fyLabel } = await getActiveFYRange(companyId, fyParam);
    const bm   = branchMatch(branch);
    const base = { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd }, ...bm };

    const today = new Date();
    const d30   = new Date(today.getTime() - 30  * 86_400_000);
    const d60   = new Date(today.getTime() - 60  * 86_400_000);
    const d90   = new Date(today.getTime() - 90  * 86_400_000);

    const [
      purchasesByMonth, purchasesByParty, topCreditors,
      totalPayables, upcomingPayments,
      c0_30, c31_60, c61_90, c91plus,
    ] = await Promise.all([
      Voucher.aggregate([{ $match: base }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Voucher.aggregate([{ $match: { ...base, partyName: { $exists: true, $ne: null } } }, { $group: { _id: '$partyName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 20 }]),
      Ledger.find({ companyId, group: 'Sundry Creditors', isDr: false }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance openingBalance gstin phone').lean(),
      Ledger.aggregate([{ $match: { companyId, group: 'Sundry Creditors', isDr: false } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
      // Upcoming payments: most recent Payment vouchers
      Voucher.find({ companyId, voucherType: 'Payment', ...bm }).sort({ date: -1 }).limit(10).select('date partyName amount narration').lean(),
      // Creditor aging: bucket Purchase vouchers by age from today (proxy for outstanding age)
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: d30, $lte: fyEnd }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: d60, $lt: d30 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: d90, $lt: d60 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lt: d90 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const ytdPurchases  = (purchasesByMonth as any[]).reduce((s, m) => s + m.total, 0);
    const totalCred     = (totalPayables[0] as any)?.total ?? 0;
    const creditorCount = (totalPayables[0] as any)?.count ?? 0;
    const dpo           = ytdPurchases > 0 ? Math.round((totalCred / ytdPurchases) * 360) : 0;

    const creditorAging = {
      '0-30':  (c0_30[0] as any)?.total   ?? 0,
      '31-60': (c31_60[0] as any)?.total  ?? 0,
      '61-90': (c61_90[0] as any)?.total  ?? 0,
      '91+':   (c91plus[0] as any)?.total ?? 0,
    };

    res.json({
      success: true, companyId,
      financialYear: fyLabel,
      summary: { ytdPurchases, totalPayables: totalCred, creditorCount, dpo },
      purchasesByMonth, purchasesByParty, topCreditors,
      upcomingPayments,
      creditorAging,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Server error' });
  }
});

export default router;
