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
  const base = { companyId, voucherType: 'Sales', date: { $gte: fyStart, $lte: fyEnd }, ...bm };

  const [salesByMonth, salesByParty, topDebtors, totalReceivables, totalSalesYTD] = await Promise.all([
    Voucher.aggregate([{ $match: base }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
    Voucher.aggregate([{ $match: { ...base, partyName: { $exists: true, $ne: null } } }, { $group: { _id: '$partyName', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 20 }]),
    Ledger.find({ companyId, group: 'Sundry Debtors', isDr: true }).sort({ closingBalance: -1 }).limit(10).select('name closingBalance openingBalance gstin phone').lean(),
    Ledger.aggregate([{ $match: { companyId, group: 'Sundry Debtors', isDr: true } }, { $group: { _id: null, total: { $sum: '$closingBalance' }, count: { $sum: 1 } } }]),
    Voucher.aggregate([{ $match: base }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  const ytdSales    = (totalSalesYTD[0] as any)?.total   ?? 0;
  const debtors     = (totalReceivables[0] as any)?.total ?? 0;
  const debtorCount = (totalReceivables[0] as any)?.count ?? 0;
  const lastMSales  = (salesByMonth as any[]).at(-1)?.total ?? 1;
  const dso         = Math.round((debtors / lastMSales) * 30);

  res.json({ success: true, companyId, summary: { ytdSales, totalDebtors: debtors, debtorCount, dso }, salesByMonth, salesByParty, topDebtors });
});

export default router;
