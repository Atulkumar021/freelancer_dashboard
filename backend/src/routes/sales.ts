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
    const base = { companyId, voucherType: 'Sales', date: { $gte: fyStart, $lte: fyEnd }, ...bm };

    const today = new Date();
    const d30   = new Date(today.getTime() - 30  * 86_400_000);
    const d60   = new Date(today.getTime() - 60  * 86_400_000);
    const d90   = new Date(today.getTime() - 90  * 86_400_000);

    const [
      salesByMonth, salesByParty, topDebtors,
      totalReceivables, totalSalesYTD,
      collectionsAgg, monthlyCollections,
      a0_30, a31_60, a61_90, a91plus,
    ] = await Promise.all([
      Voucher.aggregate([{ $match: base }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Voucher.aggregate([{ $match: { ...base, partyName: { $exists: true, $ne: null } } }, { $group: { _id: '$partyName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 20 }]),
      Ledger.find({ companyId, group: 'Sundry Debtors', isDr: true }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance openingBalance gstin phone').lean(),
      Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors', isDr: true } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
      Voucher.aggregate([{ $match: base }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      // Receipt vouchers → collectionsYTD
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Receipt', date: { $gte: fyStart, $lte: fyEnd }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Receipt', date: { $gte: fyStart, $lte: fyEnd }, ...bm } }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      // Debtor aging: bucket Sales vouchers by age from today (proxy for outstanding age)
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: d30, $lte: fyEnd }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: d60, $lt: d30 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: d90, $lt: d60 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: fyStart, $lt: d90 }, ...bm } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const ytdSales       = (totalSalesYTD[0] as any)?.total   ?? 0;
    const debtors        = (totalReceivables[0] as any)?.total ?? 0;
    const debtorCount    = (totalReceivables[0] as any)?.count ?? 0;
    const collectionsYTD = (collectionsAgg[0] as any)?.total   ?? 0;
    const dso            = ytdSales > 0 ? Math.round((debtors / ytdSales) * 360) : 0;

    const debtorAging = {
      '0-30':  (a0_30[0] as any)?.total   ?? 0,
      '31-60': (a31_60[0] as any)?.total  ?? 0,
      '61-90': (a61_90[0] as any)?.total  ?? 0,
      '91+':   (a91plus[0] as any)?.total ?? 0,
    };

    res.json({
      success: true, companyId,
      financialYear: fyLabel,
      summary: { ytdSales, totalDebtors: debtors, debtorCount, dso, collectionsYTD },
      salesByMonth, salesByParty, topDebtors,
      monthlyCollections,
      debtorAging,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Server error' });
  }
});

export default router;
