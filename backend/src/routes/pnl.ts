import { Router, Request, Response } from 'express';
import Voucher from '../models/voucher';
import Ledger from '../models/ledger';
import BudgetItem from '../models/budgetItem';
import { getActiveFYRange, branchMatch } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId as string;
    const fyParam   = typeof req.query.fy === 'string' ? req.query.fy : undefined;
    const branch    = typeof req.query.branch === 'string' ? req.query.branch : undefined;
    const { start: fyStart, end: fyEnd, label: fyLabel } = await getActiveFYRange(companyId, fyParam);
    const bm        = branchMatch(branch);
    const baseSales = { companyId, voucherType: 'Sales',    date: { $gte: fyStart, $lte: fyEnd }, ...bm };
    const basePurch = { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd }, ...bm };

    const [
      salesAgg, purchasesAgg,
      salesByMonth, purchasesByMonth,
      expenseLedgers, budgetItems,
      otherIncAgg, depAgg, finCostAgg, taxAgg,
    ] = await Promise.all([
      Voucher.aggregate([{ $match: baseSales }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: basePurch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Voucher.aggregate([{ $match: baseSales }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Voucher.aggregate([{ $match: basePurch }, { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Ledger.find({ companyId, group: { $in: ['Indirect Expenses','Direct Expenses'] } }).select('name group closingBalance isDr').lean(),
      BudgetItem.find({ companyId, financialYear: fyLabel }).lean(),
      // Other/Indirect income
      Ledger.aggregate([{ $match: { companyId, group: { $in: ['Indirect Income','Other Income'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
      // Depreciation (indirect expense)
      Ledger.aggregate([{ $match: { companyId, name: { $regex: /depreciation/i }, group: 'Indirect Expenses' } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
      // Finance cost
      Ledger.aggregate([{ $match: { companyId, group: { $in: ['Finance Charges','Interest Paid'] } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
      // Provision for tax
      Ledger.aggregate([{ $match: { companyId, name: { $regex: /provision|income.?tax/i } } }, { $group: { _id: null, t: { $sum: '$closingBalance' } } }]),
    ]);

    const revenue      = (salesAgg[0] as any)?.total     ?? 0;
    const cogs         = (purchasesAgg[0] as any)?.total ?? 0;
    const grossProfit  = revenue - cogs;
    const gpPct        = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const indirectExp  = (expenseLedgers as any[]).filter((l) => l.group === 'Indirect Expenses').reduce((s, l) => s + (l.closingBalance ?? 0), 0);
    const otherIncome  = (otherIncAgg[0] as any)?.t  ?? 0;
    const depreciation = (depAgg[0] as any)?.t       ?? 0;
    const finCost      = (finCostAgg[0] as any)?.t   ?? 0;
    const provisionTax = (taxAgg[0] as any)?.t       ?? 0;
    const ebitda       = grossProfit - indirectExp;
    const ebitdaPct    = revenue > 0 ? (ebitda / revenue) * 100 : 0;
    const ebit         = ebitda - depreciation;
    const pbt          = ebit - finCost;
    const netProfit    = pbt - provisionTax;

    const topExpenses = [...(expenseLedgers as any[])].sort((a, b) => (b.closingBalance ?? 0) - (a.closingBalance ?? 0)).slice(0, 10);

    const monthlyPnL = (salesByMonth as any[]).map((s) => {
      const p  = (purchasesByMonth as any[]).find((p) => p._id.year === s._id.year && p._id.month === s._id.month);
      const gp = s.total - (p?.total ?? 0);
      return { year: s._id.year, month: s._id.month, revenue: s.total, cogs: p?.total ?? 0, grossProfit: gp, ebitda: gp, netProfit: gp, gpPct: s.total > 0 ? (gp / s.total) * 100 : 0 };
    });

    res.json({
      success: true, companyId, financialYear: fyLabel,
      summary: { revenue, cogs, grossProfit, gpPct, otherIncome, indirectExp, depreciation, finCost, ebitda, ebitdaPct, ebit, pbt, netProfit },
      monthlyPnL, topExpenses, budgetItems, expenseLedgers,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Server error' });
  }
});

export default router;
