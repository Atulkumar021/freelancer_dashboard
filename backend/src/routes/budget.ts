import { Router, Request, Response } from 'express';
import BudgetItem from '../models/budgetItem';
import Voucher from '../models/voucher';
import { getCurrentFYRange, requireAuth, badRequest } from '../helpers';

const router = Router();

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { label: fyLabel, start: fyStart, end: fyEnd } = getCurrentFYRange();
  const fy = (req.query.fy as string) ?? fyLabel;

  const [budgetItems, salesByMonth, purchasesByMonth] = await Promise.all([
    BudgetItem.find({ companyId, financialYear: fy }).lean(),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Sales', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Voucher.aggregate([{ $match: { companyId, voucherType: 'Purchase', date: { $gte: fyStart, $lte: fyEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const ytdSales     = (salesByMonth[0] as any)?.total     ?? 0;
  const ytdPurchases = (purchasesByMonth[0] as any)?.total ?? 0;

  const enriched = (budgetItems as any[]).map((b) => {
    let actualAmount = b.actualAmount ?? 0;
    if (b.month === 0 && b.lineName === 'Revenue')     actualAmount = ytdSales;
    if (b.month === 0 && b.lineName === 'Direct Cost') actualAmount = ytdPurchases;
    const variance    = actualAmount - b.budgetAmount;
    const variancePct = b.budgetAmount !== 0 ? (variance / b.budgetAmount) * 100 : 0;
    return { ...b, actualAmount, variance, variancePct };
  });

  res.json({ success: true, companyId, financialYear: fy, budgetItems: enriched, ytdActuals: { sales: ytdSales, purchases: ytdPurchases } });
});

router.post('/:companyId', async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { companyId } = req.params;
  const { financialYear, items } = req.body;
  if (!financialYear || !Array.isArray(items) || !items.length) { badRequest(res, 'financialYear and items[] required'); return; }

  const ops = items.map((item: any) => ({
    updateOne: {
      filter: { companyId, financialYear, month: item.month, lineName: item.lineName },
      update: { $set: { ...item, companyId, financialYear } },
      upsert: true,
    },
  }));
  const result = await BudgetItem.bulkWrite(ops, { ordered: false });
  res.json({ success: true, upserted: (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0) });
});

export default router;
